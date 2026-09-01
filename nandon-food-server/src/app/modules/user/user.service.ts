import crypto from 'crypto';
import { User } from './user.model';
import { Product } from '../product/product.model';
import { Order } from '../order/order.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import config from '../../config';
import { sendEmail } from '../../utils/sendEmail';

const UserService = {
    // Get all users (admin)
    async getAllUsers(query: Record<string, unknown>) {
        const userQuery = new QueryBuilder(
            User.find().select('-password'),
            query
        )
            .search(['firstName', 'lastName', 'email', 'phone'])
            .filter()
            .sort()
            .paginate();

        const users = await userQuery.modelQuery;
        const meta = await userQuery.countTotal();
        return { users, meta };
    },

    // Admin stats
    async getAdminStats() {
        const [total, active, blocked, admins] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ status: 'blocked' }),
            User.countDocuments({ role: 'admin' }),
        ]);

        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        });

        return { total, active, blocked, admins, users: total - admins, newUsersThisMonth };
    },

    // Get single user
    async getUserById(id: string) {
        const user = await User.findById(id);
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Get my profile
    async getMyProfile(userId: string) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Update my profile
    async updateMyProfile(userId: string, payload: any) {
        // If password change is requested
        if (payload.currentPassword && payload.password) {
            const user = await User.findById(userId).select('+password');
            if (!user) throw new AppError(404, 'User not found');

            const isMatch = await user.comparePassword(payload.currentPassword);
            if (!isMatch) throw new AppError(400, 'Current password is incorrect');

            user.password = payload.password;
            await user.save();
            return user;
        }

        // Email change — must not collide with another account.
        if (payload.email) {
            const email = String(payload.email).toLowerCase().trim();
            const clash = await User.findOne({ email, _id: { $ne: userId } });
            if (clash) throw new AppError(400, 'That email is already in use by another account');
            payload.email = email;
        }

        // Normal profile update
        const allowedFields: Record<string, any> = {};
        const allowed = ['firstName', 'lastName', 'phone', 'avatar', 'name', 'email'];
        for (const key of allowed) {
            if (payload[key] !== undefined) {
                // Map 'name' to firstName/lastName
                if (key === 'name' && typeof payload.name === 'string') {
                    const parts = payload.name.trim().split(' ');
                    allowedFields.firstName = parts[0];
                    allowedFields.lastName = parts.slice(1).join(' ') || '';
                } else {
                    allowedFields[key] = payload[key];
                }
            }
        }

        const user = await User.findByIdAndUpdate(userId, allowedFields, { new: true, runValidators: true });
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Admin: update user
    async adminUpdateUser(id: string, payload: any) {
        const allowedFields: Record<string, any> = {};
        const allowed = ['firstName', 'lastName', 'phone', 'role', 'status', 'isEmailVerified'];
        for (const key of allowed) {
            if (payload[key] !== undefined) allowedFields[key] = payload[key];
        }
        const user = await User.findByIdAndUpdate(id, allowedFields, { new: true, runValidators: true });
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Get my addresses
    async getMyAddresses(userId: string) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');
        return user.shippingAddresses;
    },

    // Add shipping address
    async addShippingAddress(userId: string, address: any) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        // If new address is default, remove default from others
        if (address.isDefault) {
            user.shippingAddresses.forEach((addr) => (addr.isDefault = false));
        }

        // Map 'zipCode' to 'postalCode' if sent from frontend
        if (address.zipCode && !address.postalCode) {
            address.postalCode = address.zipCode;
        }

        user.shippingAddresses.push(address);
        await user.save();
        return user.shippingAddresses;
    },

    // Update shipping address
    async updateShippingAddress(userId: string, addressId: string, payload: any) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const address = (user.shippingAddresses as any).id(addressId);
        if (!address) throw new AppError(404, 'Address not found');

        if (payload.isDefault) {
            user.shippingAddresses.forEach((addr) => (addr.isDefault = false));
        }

        // Map zipCode to postalCode
        if (payload.zipCode && !payload.postalCode) {
            payload.postalCode = payload.zipCode;
        }

        Object.assign(address, payload);
        await user.save();
        return user.shippingAddresses;
    },

    // Delete shipping address
    async deleteShippingAddress(userId: string, addressId: string) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');
        user.shippingAddresses = user.shippingAddresses.filter(
            (addr: any) => addr._id?.toString() !== addressId
        );
        await user.save();
        return user.shippingAddresses;
    },

    // Get wishlist (populated with products)
    async getWishlist(userId: string) {
        const user = await User.findById(userId).populate({
            path: 'wishlist',
            select: 'name images price discountPrice stock averageRating totalReviews slug',
            match: { isDeleted: false },
        });
        if (!user) throw new AppError(404, 'User not found');
        return user.wishlist;
    },

    // Toggle wishlist
    async toggleWishlist(userId: string, productId: string) {
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const index = user.wishlist.indexOf(productId);
        if (index === -1) {
            user.wishlist.push(productId);
        } else {
            user.wishlist.splice(index, 1);
        }
        await user.save();
        return { wishlist: user.wishlist, added: index === -1 };
    },

    // Admin: update user status
    async updateUserStatus(id: string, status: 'active' | 'blocked' | 'pending') {
        const user = await User.findByIdAndUpdate(id, { status }, { new: true });
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Admin: delete user (soft)
    async deleteUser(id: string) {
        const user = await User.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!user) throw new AppError(404, 'User not found');
        return user;
    },

    // Invite a new user/admin by email. Creates a "pending" account with a
    // password-reset token and emails an invite link where they set their own
    // password. If SMTP isn't configured the link is still returned so the admin
    // can copy and share it manually.
    async inviteUser(payload: { email: string; role?: 'admin' | 'user'; firstName?: string; lastName?: string; inviterName?: string }) {
        const email = payload.email.trim().toLowerCase();

        const existing = await User.findOne({ email });
        if (existing) {
            if (existing.isDeleted) {
                throw new AppError(400, 'An account with this email was removed. Restore it instead of re-inviting.');
            }
            throw new AppError(400, 'A user with this email already exists');
        }

        // Raw token goes in the link; only its hash is stored (same scheme as reset-password).
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        // Placeholder password — never used; the invitee sets their own via the link.
        const tempPassword = crypto.randomBytes(16).toString('hex');

        const firstName = payload.firstName?.trim() || email.split('@')[0] || 'New';
        const lastName = payload.lastName?.trim() || 'Member';

        const user = await User.create({
            email,
            firstName,
            lastName,
            password: tempPassword,
            role: payload.role === 'admin' ? 'admin' : 'user',
            status: 'pending',
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        });

        const inviteLink = `${config.frontend_url}/accept-invite?token=${rawToken}`;
        const roleLabel = user.role === 'admin' ? 'an Admin' : 'a Member';

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">
                <h2 style="color:#0C2E20;margin:0 0 8px">Fresh Food Bazar</h2>
                <p style="font-size:15px;line-height:1.6">
                    You have been invited to join <b>Fresh Food Bazar</b> as ${roleLabel}${payload.inviterName ? ` by ${payload.inviterName}` : ''}.
                </p>
                <p style="font-size:15px;line-height:1.6">Click the button below to set your password and activate your account. This link is valid for 3 days.</p>
                <p style="text-align:center;margin:28px 0">
                    <a href="${inviteLink}" style="background:#F47B20;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">Accept Invite</a>
                </p>
                <p style="font-size:13px;color:#666">Or paste this link into your browser:<br><a href="${inviteLink}">${inviteLink}</a></p>
            </div>`;

        const emailSent = await sendEmail({
            to: email,
            subject: "You're invited to Fresh Food Bazar",
            html,
        });

        return {
            emailSent,
            inviteLink,
            user: { _id: user._id, email: user.email, role: user.role, status: user.status },
        };
    },
};

export default UserService;
