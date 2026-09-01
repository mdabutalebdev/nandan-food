// Static brand / contact config for Nandon Foods.
// These are safe defaults; anything the admin edits in `site-content`
// overrides them at runtime (wired in later).

export const site = {
  name: "Nandon Foods",
  legalName: "A concern of Fardin Meat & Agro Food Ltd.",
  tagline: "Eat Food Better · Good Food | Good Mood",
  logo: "/347269835_152420081169493_2139440638254350418_n.jpg",

  phone: "01617-298308",
  phoneHref: "tel:+8801617298308",
  whatsapp: "8801617298308",
  email: "support@nandonfood.com",
  address: "Dhaka, Bangladesh",

  socials: {
    facebook: "https://facebook.com/",
    youtube: "https://youtube.com/",
    instagram: "https://instagram.com/",
  },

  // Rotating strip in the header (admin-managed later).
  ticker: [
    "🚚 Free home delivery inside Dhaka on orders over ৳1500",
    "🥩 100% Halal · Fresh & frozen meat, fish, poultry & agro products",
    "📞 Order now: 01617-298308",
    "✅ HACCP & ISO certified processing",
  ],
} as const;

export type Site = typeof site;
