import { Schema, model } from 'mongoose';

// ── Ticker Item ──
const tickerItemSchema = new Schema({
    text: { type: String, required: true },
    emoji: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── Contact Info ──
const businessHourSchema = new Schema({
    day: { type: String, required: true },
    time: { type: String, required: true },
}, { _id: true });

// One social profile. `platform` drives the icon the footer draws; `label` is
// the text an admin sees. Only entries that are BOTH active and have a URL are
// rendered on the storefront.
const socialLinkSchema = new Schema({
    platform: { type: String, default: 'custom' }, // facebook | instagram | youtube | linkedin | tiktok | x | whatsapp | telegram | pinterest | custom
    label: { type: String, required: true },
    url: { type: String, default: '' },
    color: { type: String, default: '#000000' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── Home page product slider ──
// One entry = one titled slider on the home page. `source` decides which
// products fill it; the admin can add, reorder, retitle or hide any of them.
const homeSectionSchema = new Schema({
    title: { type: String, required: true },
    source: {
        type: String,
        enum: ['newest', 'best-selling', 'top-rated', 'category', 'flag', 'manual'],
        default: 'newest',
    },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null }, // source: 'category'
    flag: { type: String, default: '' },                                        // source: 'flag'
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],                // source: 'manual'
    // How the section is drawn: a plain product slider, or the orange "combo deals" cards.
    layout: { type: String, enum: ['slider', 'combo'], default: 'slider' },
    limit: { type: Number, default: 10, min: 1, max: 40 },
    viewAllHref: { type: String, default: '' },   // blank = derived from the source
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

// ── Top Selling section (home page) ──
// Admin hand-picks the products shown in the home page "Top Selling" block.
// When `products` is empty the storefront falls back to auto (most-sold first).
const topSellingSchema = new Schema({
    title: { type: String, default: 'Top Selling Products' },
    active: { type: Boolean, default: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    limit: { type: Number, default: 8, min: 1, max: 40 },
}, { _id: false });

// ── Header navigation menu ──
// Extra, hand-built items only. The header always renders the category tree on
// its own, and these sit before or after it — so an empty list is the normal
// case, not a fallback.
const navChildSchema = new Schema({
    label: { type: String, required: true, trim: true },
    href: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: true });

const navItemSchema = new Schema({
    label: { type: String, required: true, trim: true },
    href: { type: String, default: '' },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // Where this item sits relative to the auto category list in the nav bar.
    position: { type: String, enum: ['before', 'after'], default: 'after' },
    children: { type: [navChildSchema], default: [] },
}, { _id: true });

// ── Generic homepage content card ──
// Reused by Health Promises (image + title + description cards) and the
// "Our Products" / "Outlets" wide-banner sections. All admin-managed.
const contentCardSchema = new Schema({
    imageUrl:    { type: String, default: '' },
    title:       { type: String, default: '' },
    description: { type: String, default: '' },
    link:        { type: String, default: '' },
    active:      { type: Boolean, default: true },
    order:       { type: Number, default: 0 },
}, { _id: true });

// ── Main Site Content Schema ──
const siteContentSchema = new Schema({
    // Only one document — singleton
    _key: { type: String, default: 'main', unique: true },

    // ── Delivery Charge (legacy pair — kept as the fallback) ──
    deliveryCharge: {
        insideDhaka: { type: Number, default: 60 },
        outsideDhaka: { type: Number, default: 120 },
    },

    // ── Delivery zones (admin-managed, unlimited) ──
    // The checkout renders one button per active zone and charges its rate.
    deliveryZones: [{
        name:      { type: String, required: true, trim: true },   // "Inside Dhaka", "Chattogram"…
        charge:    { type: Number, default: 0 },
        note:      { type: String, default: '' },                  // "1–2 days"
        isDefault: { type: Boolean, default: false },
        active:    { type: Boolean, default: true },
        order:     { type: Number, default: 0 },
    }],

    // Orders at or above this subtotal ship free (0 = disabled).
    freeDeliveryAbove: { type: Number, default: 0 },

    // ── Invoice / company details (printed on every invoice) ──
    invoice: {
        companyName:  { type: String, default: 'Nandon Foods' },
        addressLine:  { type: String, default: '' },
        phone:        { type: String, default: '' },
        email:        { type: String, default: '' },
        website:      { type: String, default: '' },
        binNo:        { type: String, default: '' },
        tinNo:        { type: String, default: '' },
        logoUrl:      { type: String, default: '' },
        footerNote:   { type: String, default: 'Thank you for your business.' },
        terms:        { type: String, default: '' },
        showVat:      { type: Boolean, default: false },
        vatPercent:   { type: Number, default: 0 },
    },

    // ── Header Ticker ──
    ticker: [tickerItemSchema],

    // ── Home page product sliders ──
    homeSections: [homeSectionSchema],

    // ── Header navigation menu ──
    navMenu: [navItemSchema],

    // ── Home page "Top Selling" block (admin hand-picked) ──
    topSelling: { type: topSellingSchema, default: () => ({}) },

    // ── Contact Page ──
    contact: {
        phone: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        email: { type: String, default: '' },
        address: { type: String, default: '' },
        hours: [businessHourSchema],
        tips: [{ type: String }],
        socials: [socialLinkSchema],
        subjects: [{ type: String }],
    },

    // ── Floating Widget ──
    floating: {
        phone: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        showPhone: { type: Boolean, default: true },
        showWhatsapp: { type: Boolean, default: true },
        showMessenger: { type: Boolean, default: true },
    },

    // ── Mobile Payment Numbers (bKash / Rocket / Nagad) ──
    payment: {
        bkash:  { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        rocket: { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        nagad:  { number: { type: String, default: '' }, accountType: { type: String, default: 'Personal' }, active: { type: Boolean, default: true } },
        instructions: { type: String, default: 'Send Money to the number above, then submit your number, transaction ID and payment time below.' },
    },

    // ── Footer ──
    footer: {
        companyName: { type: String, default: 'Fresh Food Bazar' },
        copyright: { type: String, default: '' },
        links: [{
            label: { type: String, required: true },
            url: { type: String, required: true },
        }],
    },

    // ── Default Product Tagline ──
    defaultTagline: { type: String, default: 'Lower price than others but quality higher' },

    // ── SEO / Meta ──
    seo: {
        title: { type: String, default: 'Fresh Food Bazar - Premium Online Shopping Experience' },
        description: { type: String, default: 'Shop the latest products with amazing deals at Fresh Food Bazar.' },
        keywords: { type: String, default: 'freshfoodbazar global, ecommerce, online shopping' },
    },

    // ── Announcement Bar ──
    announcement: {
        message: { type: String, default: '' },
        bgColor: { type: String, default: '#E4525C' },
        textColor: { type: String, default: '#FFFFFF' },
        active: { type: Boolean, default: false },
        dismissible: { type: Boolean, default: true },
    },

    // ── Content pages (Terms, Privacy, Refund, About Us, FAQs) ──
    legalPages: [{
        slug: { type: String, required: true, enum: ['terms', 'privacy', 'refund', 'about', 'faq'] },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        active: { type: Boolean, default: true },
        lastUpdated: { type: Date, default: Date.now },
    }],

    // ── Theme / Appearance ──
    theme: {
        primaryColor: { type: String, default: '#0B4222' },
        secondaryColor: { type: String, default: '#E4525C' },
        logoUrl: { type: String, default: '' },
        faviconUrl: { type: String, default: '' },
        // Text color shown on top of the primary color (buttons, ticker, etc.)
        // 'auto'  → picked automatically from the primary color's brightness
        // 'light' → always white   |   'dark' → always near-black
        primaryTextMode: { type: String, enum: ['auto', 'light', 'dark'], default: 'auto' },
    },

    // ── Hero Slides (image OR video — uploaded video / YouTube link) ──
    heroSlides: [{
        mediaType:  { type: String, enum: ['image', 'video'], default: 'image' },
        imageUrl:   { type: String, default: '' }, // when mediaType === 'image'
        videoUrl:   { type: String, default: '' }, // uploaded video (Cloudinary)
        youtubeUrl: { type: String, default: '' }, // YouTube link
        link:       { type: String, default: '' }, // where the banner navigates on click
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    }],

    // ── Hero Side Banner — legacy single panel, migrated into heroSideBanners ──
    heroSideBanner: {
        imageUrl: { type: String, default: '' },
        link:     { type: String, default: '' },
        active:   { type: Boolean, default: true },
    },

    // ── Hero Side Banners (the narrow panel beside the carousel) ──
    // More than one rotates just like the main carousel.
    heroSideBanners: [{
        imageUrl: { type: String, default: '' },
        link:     { type: String, default: '' },
        active:   { type: Boolean, default: true },
        order:    { type: Number, default: 0 },
    }],

    // ── Homepage dynamic sections (admin-managed) ──
    healthPromises: [contentCardSchema],   // "Our Health Promises" card grid
    productShowcase: [contentCardSchema],  // "Our Products" wide banners
    outlets: [contentCardSchema],          // homepage "Franchised Outlets" wide banners
    outletList: [contentCardSchema],       // the /outlets page image gallery (managed on its own)
    exportBrochure: [contentCardSchema],   // "Export Brochure" wide banner (world-map style)

    // ── Careers (job openings — admin-managed, shown on /career) ──
    careers: [{
        title:       { type: String, required: true },
        location:    { type: String, default: 'Dhaka, Bangladesh' },
        type:        { type: String, default: 'Full-time' }, // Full-time / Part-time / Contract / Internship
        department:  { type: String, default: '' },
        description: { type: String, default: '' },
        deadline:    { type: String, default: '' },
        applyEmail:  { type: String, default: '' },
        applyLink:   { type: String, default: '' },
        active:      { type: Boolean, default: true },
        order:       { type: Number, default: 0 },
    }],

    // ── About Us page (all sections admin-managed, rendered on /about) ──
    // Intro — "About": left text + right image.
    aboutIntro: {
        eyebrow:  { type: String, default: 'Who we are' },
        title:    { type: String, default: '' },
        body:     { type: String, default: '' },   // multi-paragraph (split on blank line)
        imageUrl: { type: String, default: '' },
    },
    // Mission / Vision — text blocks (optional supporting image).
    aboutMission: {
        title:    { type: String, default: 'Mission' },
        body:     { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },
    aboutVision: {
        title:    { type: String, default: 'Vision' },
        body:     { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },
    // Message — left image, right message from the owner / management.
    ownerMessage: {
        title:       { type: String, default: 'Message' },
        name:        { type: String, default: '' },
        designation: { type: String, default: '' },
        message:     { type: String, default: '' },
        imageUrl:    { type: String, default: '' },
    },
    // Our Management — member cards (title = name, description = designation).
    management: [contentCardSchema],
    // Our Clients — logos shown in the two-row marquee.
    clients: [contentCardSchema],
    // Certifications — certificate images (title = optional caption).
    certifications: [contentCardSchema],

}, { timestamps: true });

export const SiteContent = model('SiteContent', siteContentSchema);
