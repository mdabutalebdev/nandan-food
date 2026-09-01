import { SiteContent } from './siteContent.model';

const SiteContentService = {
    // Get site content (creates default if not exists)
    async get() {
        let content = await SiteContent.findOne({ _key: 'main' });
        if (!content) {
            content = await SiteContent.create({
                _key: 'main',
                ticker: [
                    { text: 'Supply', emoji: '', active: true, order: 0 },
                    { text: 'Solution', emoji: '', active: true, order: 1 },
                    { text: 'Satisfaction', emoji: '', active: true, order: 2 },
                    { text: '🎉 Special Offer: Get 50% OFF on all Electronics! Limited Time Only!', emoji: '🎉', active: true, order: 3 },
                    { text: '🚚 Free Shipping on orders over Tk.5000', emoji: '🚚', active: true, order: 4 },
                    { text: '💳 Extra 10% Cashback with bKash Payment', emoji: '💳', active: true, order: 5 },
                ],
                contact: {
                    phone: '01753923093',
                    whatsapp: '01322840808',
                    email: 'support@freshfoodbazar.com',
                    address: 'Dhaka, Bangladesh',
                    hours: [
                        { day: 'Sunday – Thursday', time: '9:00 AM – 6:00 PM' },
                        { day: 'Friday', time: '2:00 PM – 6:00 PM' },
                        { day: 'Saturday', time: 'Closed' },
                    ],
                    tips: [
                        'Have your order ID ready for faster support',
                        'WhatsApp is the fastest way to reach us',
                        'Attach screenshots for product issues',
                    ],
                    socials: [
                        { label: 'Facebook', url: '#', color: '#1877F2' },
                        { label: 'Instagram', url: '#', color: '#E1306C' },
                        { label: 'YouTube', url: '#', color: '#FF0000' },
                    ],
                    subjects: ['Order Issue', 'Product Inquiry', 'Return / Refund', 'Delivery Problem', 'Payment Issue', 'Other'],
                },
                floating: {
                    phone: '+880 1753923093',
                    whatsapp: '8801322840808',
                    messenger: 'YOUR_PAGE_USERNAME',
                    showPhone: true,
                    showWhatsapp: true,
                    showMessenger: true,
                },
                footer: {
                    companyName: 'Fresh Food Bazar',
                    copyright: '',
                    links: [],
                },
                defaultTagline: 'Lower price than others but quality higher',
                seo: {
                    title: 'Fresh Food Bazar - Premium Online Shopping Experience',
                    description: 'Shop the latest products with amazing deals at Fresh Food Bazar. Premium quality products at best prices.',
                    keywords: 'freshfoodbazar global, ecommerce, online shopping, best deals, products, shop',
                },
                announcement: {
                    message: '',
                    bgColor: '#E4525C',
                    textColor: '#FFFFFF',
                    active: false,
                    dismissible: true,
                },
                legalPages: [
                    { slug: 'terms', title: 'Terms & Conditions', content: '<p>Please add your Terms & Conditions content here.</p>', active: true },
                    { slug: 'privacy', title: 'Privacy Policy', content: '<p>Please add your Privacy Policy content here.</p>', active: true },
                    { slug: 'refund', title: 'Refund Policy', content: '<p>Please add your Refund Policy content here.</p>', active: true },
                ],
            });
        }

        // Auto-migrate: ensure legalPages exist and have real content
        const needsSeed = !content.legalPages || (content.legalPages as any[]).length === 0
            || (content.legalPages as any[]).every((p: any) => !p.content || p.content.replace(/<[^>]*>/g, '').trim().length < 200);

        if (needsSeed) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        legalPages: [
                            {
                                slug: 'terms', title: 'Terms & Conditions', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Acceptance of Terms</h2><p>By accessing and using the Fresh Food Bazar website (www.freshfoodbazar.com) and its services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our website or services.</p><p>We reserve the right to modify these terms at any time. Continued use of the website after changes constitutes acceptance of the updated terms.</p><h2>2. Services Overview</h2><p>Fresh Food Bazar provides a global e-commerce and trading platform connecting international suppliers with buyers. Our services include:</p><ul><li><strong>Buy and Ship for Me</strong> — We purchase products on your behalf from international marketplaces and ship them to your address.</li><li><strong>Ship for Me</strong> — You purchase the product yourself, and we handle the international shipping and logistics.</li><li><strong>Request for Quotation (RFQ)</strong> — Submit product requirements and receive competitive quotes from verified suppliers.</li><li><strong>Direct Purchase</strong> — Browse and buy products directly through our platform.</li></ul><h2>3. User Accounts & Registration</h2><p>To place orders, you may be required to create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p><p>We reserve the right to suspend or terminate accounts that violate our terms, provide false information, or engage in fraudulent activities. Guest checkout is available for one-time purchases — an account will be automatically created using your contact information.</p><h2>4. Pricing & Payment</h2><p>All prices displayed on the website are in Bangladeshi Taka (BDT) unless otherwise specified. Prices are subject to change without prior notice; however, the price at the time of order placement will be honored.</p><p>We accept multiple payment methods including Cash on Delivery (COD), bKash, Nagad, bank transfer, and international cards (Visa, Mastercard, Amex). All transactions are processed securely. We do not store your payment card details on our servers.</p><h2>5. Shipping & Delivery</h2><p>Delivery timelines vary based on product origin, shipping method, and destination. Estimated delivery times are provided at the time of order. International shipments may be subject to customs duties, import taxes, and other fees — these charges are the buyer's responsibility.</p><p>Fresh Food Bazar is not liable for delays caused by customs clearance, natural disasters, pandemics, or other force majeure events.</p><h2>6. Product Information & Accuracy</h2><p>We strive to provide accurate product descriptions, images, and specifications. However, we do not guarantee that all information is error-free. If a product is materially different from what was described, you are eligible for a return or exchange as per our Refund Policy.</p><h2>7. Order Cancellation & Modifications</h2><p>Orders can be cancelled or modified before they are dispatched. Once shipped, cancellation is subject to our return policy. To cancel or modify an order, contact our support team at <strong>support@freshfoodbazar.com</strong> or via Live Chat.</p><h2>8. Intellectual Property</h2><p>All content on the Fresh Food Bazar website — including text, graphics, logos, images, and software — is the property of Fresh Food Bazar Technologies Ltd. and is protected by copyright and trademark laws.</p><h2>9. Limitation of Liability</h2><p>Fresh Food Bazar shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services. Our total liability for any claim shall not exceed the amount you paid for the specific product or service.</p><h2>10. Governing Law</h2><p>These Terms and Conditions are governed by the laws of the People's Republic of Bangladesh. Any disputes shall be resolved through the courts of Dhaka, Bangladesh. For questions, contact us at <strong>legal@freshfoodbazar.com</strong>.</p>`,
                            },
                            {
                                slug: 'privacy', title: 'Privacy Policy', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Information We Collect</h2><p>We collect information to provide better services to our users:</p><ul><li><strong>Personal Information:</strong> Name, email address, phone number, shipping address, and billing information provided during account creation or checkout.</li><li><strong>Account Data:</strong> Login credentials, order history, wishlist items, and communication preferences.</li><li><strong>Device Information:</strong> IP address, browser type, operating system, and cookies for analytics.</li><li><strong>Usage Data:</strong> Pages visited, products viewed, search queries, and time spent on our platform.</li><li><strong>Transaction Data:</strong> Payment method details, purchase history, and transaction records.</li></ul><h2>2. How We Use Your Information</h2><ul><li><strong>Order Processing</strong> — To process, fulfill, and track your orders, including international shipping.</li><li><strong>Account Management</strong> — To create, maintain, and secure your account.</li><li><strong>Communication</strong> — To send order confirmations, shipping updates, and respond to inquiries.</li><li><strong>Service Improvement</strong> — To analyze usage patterns and improve our platform.</li><li><strong>Marketing</strong> — To send promotional offers and recommendations (with your consent).</li><li><strong>Fraud Prevention</strong> — To detect, prevent, and address fraudulent activities.</li></ul><h2>3. Information Sharing & Disclosure</h2><p>We do not sell, trade, or rent your personal information. We may share your data with:</p><ul><li><strong>Service Providers:</strong> Payment processors (bKash, Nagad, Stripe), shipping partners, and hosting providers.</li><li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation.</li><li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets.</li></ul><h2>4. Data Security</h2><p>We implement industry-standard security measures including:</p><ul><li>SSL/TLS encryption for all data transmission.</li><li>Encrypted storage of passwords using bcrypt hashing.</li><li>Regular security audits and vulnerability assessments.</li><li>Secure payment processing through PCI-DSS compliant gateways.</li></ul><h2>5. Cookies & Tracking</h2><p>We use cookies for essential website functionality, analytics, and marketing. You can control cookie preferences through your browser settings.</p><h2>6. Your Rights & Choices</h2><ul><li><strong>Access</strong> — Request a copy of your personal information.</li><li><strong>Correction</strong> — Update inaccurate information in your account settings.</li><li><strong>Deletion</strong> — Request deletion of your account and personal data.</li><li><strong>Opt-Out</strong> — Unsubscribe from marketing communications at any time.</li></ul><p>To exercise your rights, contact us at <strong>privacy@freshfoodbazar.com</strong>.</p><h2>7. Children's Privacy</h2><p>Our services are not intended for children under 16. We do not knowingly collect personal information from children.</p><h2>8. International Data Transfers</h2><p>Your data may be transferred to countries outside Bangladesh where our suppliers and partners operate. We ensure appropriate safeguards are in place.</p><h2>9. Data Retention</h2><p>We retain your information as long as necessary for the purposes outlined in this policy. Transaction records are kept as required by financial regulations (typically 6-7 years).</p><h2>10. Changes to This Policy</h2><p>We may update this policy from time to time. Significant changes will be communicated via email or a notice on our website.</p>`,
                            },
                            {
                                slug: 'refund', title: 'Refund Policy', active: true, lastUpdated: new Date(),
                                content: `<h2>1. Overview</h2><p>At Fresh Food Bazar, customer satisfaction is our top priority. This Refund Policy outlines the terms under which you may request a return, exchange, or refund for products purchased through our platform.</p><h2>2. Eligibility for Returns</h2><p>You may request a return or exchange under the following conditions:</p><ul><li>The product is damaged, defective, or broken upon arrival.</li><li>The product received is significantly different from what was described or ordered.</li><li>The product is missing parts or accessories listed in the description.</li><li>The return request is made within <strong>7 days</strong> of delivery.</li></ul><p>Products that have been used, altered, washed, or damaged by the customer after delivery are <strong>not eligible</strong> for returns.</p><h2>3. Non-Returnable Items</h2><ul><li>Perishable goods (food, flowers, etc.)</li><li>Personal care and hygiene products (opened)</li><li>Customized or personalized items</li><li>Downloadable software or digital products</li><li>Undergarments and intimate apparel</li><li>Items marked as "Final Sale" or "Non-Returnable"</li></ul><h2>4. How to Request a Return</h2><ul><li><strong>Step 1:</strong> Contact our support team at <strong>support@freshfoodbazar.com</strong> or via WhatsApp within 7 days of receiving your order.</li><li><strong>Step 2:</strong> Provide your Order ID, product details, and clear photos/videos showing the issue.</li><li><strong>Step 3:</strong> Our team will review and respond within 24-48 hours.</li><li><strong>Step 4:</strong> If approved, you will receive return shipping instructions.</li><li><strong>Step 5:</strong> Once we receive and inspect the item, your refund or replacement will be processed.</li></ul><h2>5. Refund Processing</h2><ul><li><strong>Refund Method:</strong> Refunds are issued to the original payment method.</li><li><strong>Processing Time:</strong> Refunds are typically processed within <strong>5-10 business days</strong> after receiving the returned item.</li><li><strong>Partial Refunds:</strong> May be issued if the product shows signs of use not caused during shipping.</li></ul><h2>6. Return Shipping Costs</h2><ul><li>If the return is due to our error (wrong item, defective), <strong>Fresh Food Bazar covers return shipping costs</strong>.</li><li>If the return is due to customer preference (change of mind), <strong>the customer pays return shipping</strong>.</li></ul><h2>7. Exchanges</h2><p>For defective or wrong items, we will send a replacement at no additional cost, subject to availability. If the product is unavailable, you will receive a full refund.</p><h2>8. International Orders</h2><p>For international returns, shipping costs and customs fees are the buyer's responsibility unless caused by our error. International refunds may take longer due to cross-border processing.</p><h2>9. Cancellation Before Shipping</h2><p>Orders cancelled before shipping receive a full refund within 3-5 business days. For "Buy and Ship for Me" orders already purchased, a cancellation fee of up to 15% may apply.</p><h2>10. Contact Us</h2><p>For refund questions or assistance:</p><ul><li><strong>Email:</strong> support@freshfoodbazar.com</li><li><strong>WhatsApp:</strong> +880 1322840808</li><li><strong>Phone:</strong> +880 1753923093</li></ul><p>Our support team is available Sunday–Thursday, 9:00 AM – 6:00 PM (BST).</p>`,
                            },
                        ],
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: the side banner used to be a single object. Move it into the
        // new array the first time, so nothing an admin already uploaded is lost.
        const sideNeverSeeded = await SiteContent.exists({ _key: 'main', heroSideBanners: { $exists: false } });
        if (sideNeverSeeded) {
            const legacy = (content as any)?.heroSideBanner;
            const seeded = legacy?.imageUrl
                ? [{ imageUrl: legacy.imageUrl, link: legacy.link || '', active: legacy.active !== false, order: 0 }]
                : [];
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $set: { heroSideBanners: seeded } },
                { new: true }
            );
        }

        // Auto-migrate: seed the home page sliders the first time. Only when the field
        // is absent — an admin who deletes every section keeps an empty home page.
        // Mongoose hands back [] for a missing array, so ask the DB whether the key
        // itself is absent — otherwise this would re-seed on every request.
        const neverSeeded = await SiteContent.exists({ _key: 'main', homeSections: { $exists: false } });
        if (neverSeeded) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        homeSections: [
                            { title: 'New Arrivals', source: 'newest', limit: 10, active: true, order: 0 },
                            { title: 'Best Selling', source: 'best-selling', limit: 10, active: true, order: 1 },
                            { title: 'Top Rated', source: 'top-rated', limit: 10, active: true, order: 2 },
                        ],
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: add the About Us / FAQs pages that the header "More" menu links
        // to. Appended, never overwriting whatever the admin already wrote.
        const existingSlugs = new Set(((content?.legalPages as any[]) || []).map((p: any) => p.slug));
        const missingPages = [
            { slug: 'about', title: 'About Us', content: '<p>Add your About Us content from the admin panel (Site Content → Pages).</p>', active: true, lastUpdated: new Date() },
            { slug: 'faq', title: 'FAQs', content: '<p>Add your frequently asked questions from the admin panel (Site Content → Pages).</p>', active: true, lastUpdated: new Date() },
        ].filter((p) => !existingSlugs.has(p.slug));

        if (missingPages.length) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $push: { legalPages: { $each: missingPages } } },
                { new: true }
            );
        }

        // Auto-migrate: turn the legacy inside/outside-Dhaka pair into the
        // editable zone list the first time. Only when the key is absent, so an
        // admin who deletes every zone keeps an empty list.
        const zonesNeverSeeded = await SiteContent.exists({ _key: 'main', deliveryZones: { $exists: false } });
        if (zonesNeverSeeded) {
            const dc: any = (content as any)?.deliveryCharge || {};
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        deliveryZones: [
                            { name: 'Inside Dhaka', charge: dc.insideDhaka ?? 60, note: '1–2 days', isDefault: true, active: true, order: 0 },
                            { name: 'Outside Dhaka', charge: dc.outsideDhaka ?? 120, note: '2–4 days', isDefault: false, active: true, order: 1 },
                        ],
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: ensure the invoice/company block exists
        if (!content.get('invoice')) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        invoice: {
                            companyName: (content as any)?.footer?.companyName || 'Nandon Foods',
                            addressLine: (content as any)?.contact?.address || '',
                            phone: (content as any)?.contact?.phone || '',
                            email: (content as any)?.contact?.email || '',
                            footerNote: 'Thank you for your business.',
                        },
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: give every social link a `platform` (so the storefront
        // knows which icon to draw) and make sure each supported network has a
        // row waiting to be filled in. Existing labels/URLs are never touched.
        {
            const KNOWN: { platform: string; label: string; color: string }[] = [
                { platform: 'facebook',  label: 'Facebook',  color: '#1877F2' },
                { platform: 'instagram', label: 'Instagram', color: '#E1306C' },
                { platform: 'youtube',   label: 'YouTube',   color: '#FF0000' },
                { platform: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
                { platform: 'tiktok',    label: 'TikTok',    color: '#111111' },
                { platform: 'x',         label: 'X',         color: '#000000' },
                { platform: 'whatsapp',  label: 'WhatsApp',  color: '#25D366' },
                { platform: 'telegram',  label: 'Telegram',  color: '#229ED9' },
                { platform: 'pinterest', label: 'Pinterest', color: '#E60023' },
            ];

            const existing: any[] = ((content as any)?.contact?.socials || []).map((s: any) => s.toObject?.() ?? s);

            // Rows written before `platform` existed come back with the schema
            // default 'custom', so the label is the only clue to what they are.
            const guess = (label: string) => {
                const key = String(label || '').toLowerCase().replace(/[^a-z]/g, '');
                if (key.includes('twitter')) return 'x';
                return KNOWN.find((k) => k.platform === key)?.platform || 'custom';
            };
            const resolve = (s: any) =>
                s.platform && s.platform !== 'custom' ? s.platform : guess(s.label);

            const stamped = existing.map((s: any, i: number) => ({
                ...s,
                platform: resolve(s),
                order: s.order ?? i,
                url: s.url === '#' ? '' : (s.url || ''),
            }));

            // Collapse duplicates of the same network, keeping whichever row
            // actually carries a link (a previous run could have added blanks).
            const merged: any[] = [];
            for (const row of stamped) {
                if (row.platform === 'custom') { merged.push(row); continue; }
                const at = merged.findIndex((m) => m.platform === row.platform);
                if (at === -1) { merged.push(row); continue; }
                const kept = merged[at];
                const better = (row.url && !kept.url) || (row.active && !kept.active && !kept.url);
                if (better) merged[at] = { ...kept, ...row, _id: kept._id };
            }

            const have = new Set(merged.map((s: any) => s.platform));
            const missing = KNOWN.filter((k) => !have.has(k.platform)).map((k, i) => ({
                ...k, url: '', active: false, order: merged.length + i,
            }));

            const next = [...merged, ...missing].map((s, i) => ({ ...s, order: i }));
            const changed =
                next.length !== existing.length ||
                next.some((s, i) => s.platform !== existing[i]?.platform || s.url !== (existing[i]?.url === '#' ? '' : existing[i]?.url || ''));

            if (changed) {
                content = await SiteContent.findOneAndUpdate(
                    { _key: 'main' },
                    { $set: { 'contact.socials': next } },
                    { new: true }
                );
            }
        }

        // Auto-migrate: seed the About Us page text the first time (from the
        // company profile). Only when the key is absent, so an admin who clears
        // it keeps it cleared. Images / members / clients / certificates stay
        // empty for the admin to upload.
        const aboutNeverSeeded = await SiteContent.exists({ _key: 'main', aboutIntro: { $exists: false } });
        if (aboutNeverSeeded) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        aboutIntro: {
                            eyebrow: 'Who we are',
                            title: 'About Nandon Foods',
                            body: `We are in supply and distributor business since 2005 under the name of "Fardin Meat & Agro Food Ltd." — a proprietorship company established by Md Lokman Hossain, one of the best veterans known in this sector. The company turned into a limited company in 2023 with the strong expansion of a wide range of customer support across different sectors of frozen food, meat and other industries of Bangladesh.\n\nNandon Foods is a leading producer and distributor of high-quality food products, specializing in chicken, beef, frozen foods and mineral water. With a commitment to excellence, innovation and customer satisfaction, Nandon Foods has established itself as a trusted name in the food industry.`,
                            imageUrl: '',
                        },
                        aboutMission: {
                            title: 'Mission',
                            body: `Our mission is to provide delicious and nutritious food products that enhance the dining experience of individuals and families. We strive to meet the diverse preferences of our consumers while maintaining the highest standards of quality, safety and sustainability.`,
                            imageUrl: '',
                        },
                        aboutVision: {
                            title: 'Vision',
                            body: `Nandon Foods envisions becoming a global leader in the food industry, recognized for our unwavering dedication to producing safe, flavorful and convenient products that cater to a wide range of culinary needs.`,
                            imageUrl: '',
                        },
                        ownerMessage: {
                            title: 'Message',
                            name: '',
                            designation: '',
                            message: '',
                            imageUrl: '',
                        },
                    },
                },
                { new: true }
            );
        }

        // Auto-migrate: give the /outlets page its own image list, seeded once
        // from the existing homepage `outlets` banners so nothing disappears.
        // After this it is managed independently (Admin → Outlets).
        const outletListNeverSeeded = await SiteContent.exists({ _key: 'main', outletList: { $exists: false } });
        if (outletListNeverSeeded) {
            const src = (((content as any)?.outlets) || []).map((o: any, i: number) => ({
                imageUrl:    o.imageUrl || '',
                title:       o.title || '',
                description: o.description || '',
                link:        o.link || '',
                active:      o.active !== false,
                order:       o.order ?? i,
            }));
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $set: { outletList: src } },
                { new: true }
            );
        }

        // Auto-migrate: ensure payment object exists
        if (!content.get('payment')) {
            content = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                {
                    $set: {
                        payment: {
                            bkash:  { number: '', accountType: 'Personal', active: true },
                            rocket: { number: '', accountType: 'Personal', active: true },
                            nagad:  { number: '', accountType: 'Personal', active: true },
                            instructions: 'Send Money to the number above, then submit your number, transaction ID and payment time below.',
                        },
                    },
                },
                { new: true }
            );
        }

        return content;
    },

    // Update site content (partial update)
    async update(data: any) {
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: data },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },

    // Update a specific section
    async updateSection(section: string, data: any) {
        const updateObj: any = {};
        updateObj[section] = data;
        const content = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: updateObj },
            { new: true, upsert: true, runValidators: true }
        );
        return content;
    },

    // Get a single legal page by slug
    async getLegalPage(slug: string) {
        // Call get() first to trigger auto-migration if needed
        const content = await this.get();
        if (!content || !content.legalPages) return null;
        const page = (content.legalPages as any[]).find((p: any) => p.slug === slug);
        return page || null;
    },

    // Update a single legal page by slug
    async updateLegalPage(slug: string, data: { title?: string; content?: string; active?: boolean }) {
        // First check if the legal page exists
        const content = await SiteContent.findOne({ _key: 'main' });
        if (!content) return null;

        const pageIndex = (content.legalPages as any[])?.findIndex((p: any) => p.slug === slug);

        if (pageIndex === -1 || pageIndex === undefined) {
            // Page doesn't exist, push it
            const newPage = { slug, title: data.title || slug, content: data.content || '', active: data.active !== false, lastUpdated: new Date() };
            const updated = await SiteContent.findOneAndUpdate(
                { _key: 'main' },
                { $push: { legalPages: newPage } },
                { new: true }
            );
            return updated?.legalPages?.find((p: any) => p.slug === slug);
        }

        // Update existing page
        const updateObj: any = {};
        if (data.title !== undefined) updateObj[`legalPages.${pageIndex}.title`] = data.title;
        if (data.content !== undefined) updateObj[`legalPages.${pageIndex}.content`] = data.content;
        if (data.active !== undefined) updateObj[`legalPages.${pageIndex}.active`] = data.active;
        updateObj[`legalPages.${pageIndex}.lastUpdated`] = new Date();

        const updated = await SiteContent.findOneAndUpdate(
            { _key: 'main' },
            { $set: updateObj },
            { new: true }
        );
        return updated?.legalPages?.find((p: any) => p.slug === slug);
    },

    // Get all legal pages (for admin listing)
    async getAllLegalPages() {
        const content = await SiteContent.findOne({ _key: 'main' });
        return content?.legalPages || [];
    },
};

export default SiteContentService;

