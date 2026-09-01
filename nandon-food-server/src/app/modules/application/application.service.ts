import { Application } from './application.model';

const ApplicationService = {
    // Public submit — whitelist fields; never trust a client-supplied status.
    async create(payload: any) {
        const clean = {
            jobTitle:    payload.jobTitle || '',
            name:        payload.name,
            phone:       payload.phone,
            email:       payload.email || '',
            cvUrl:       payload.cvUrl || '',
            coverLetter: payload.coverLetter || '',
        };
        return Application.create(clean);
    },

    async getAll(query: Record<string, unknown>) {
        const filter: any = {};
        const { status, search } = query;
        if (status && status !== 'all') filter.status = status;
        if (search) {
            filter.$or = [
                { name:     { $regex: search, $options: 'i' } },
                { phone:    { $regex: search, $options: 'i' } },
                { email:    { $regex: search, $options: 'i' } },
                { jobTitle: { $regex: search, $options: 'i' } },
            ];
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const rows = await Application.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await Application.countDocuments(filter);

        // Status counts across ALL applications (for the admin summary tabs).
        const counts = await Application.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
        const summary: Record<string, number> = { all: 0, new: 0, reviewed: 0, shortlisted: 0, rejected: 0 };
        counts.forEach((c: any) => { summary[c._id] = c.n; summary.all += c.n; });

        return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary };
    },

    getOne(id: string) {
        return Application.findById(id);
    },

    updateStatus(id: string, status: string) {
        return Application.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    },

    delete(id: string) {
        return Application.findByIdAndDelete(id);
    },
};

export default ApplicationService;
