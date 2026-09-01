import Link from "next/link";

/**
 * Stacked full-width promo banners — the kazifarms pattern (big banners
 * down the page). Imagery is admin-managed later; these are on-brand
 * CSS compositions for now.
 */
export default function BannerStack() {
  return (
    <section className="frame space-y-6 py-4">
      {/* Banner 1 — bulk / corporate supply (green) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-dark to-brand-600 p-8 text-white sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-0 right-20 h-40 w-40 rounded-full bg-cream/10" />
        <div className="relative max-w-xl">
          <span className="text-xs font-bold uppercase tracking-widest text-cream">Wholesale & HoReCa</span>
          <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
            Bulk supply for restaurants, hotels & retailers
          </h3>
          <p className="mt-2 text-sm text-white/85">
            Consistent quality, reliable cold-chain delivery and competitive
            wholesale pricing across Bangladesh.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-full bg-cream px-6 py-2.5 text-sm font-bold text-maroon-dark transition-transform hover:scale-105"
          >
            Request a quote
          </Link>
        </div>
      </div>

      {/* Banner 2 — franchise / outlet partner (maroon) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-maroon to-maroon-dark p-8 text-white sm:p-12">
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative ml-auto max-w-xl text-right">
          <span className="text-xs font-bold uppercase tracking-widest text-cream">Grow with us</span>
          <h3 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
            Become a Nandon Foods outlet partner
          </h3>
          <p className="mt-2 text-sm text-white/85">
            Join our growing network of franchised outlets and bring trusted,
            fresh food to your neighbourhood.
          </p>
          <Link
            href="/outlets"
            className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-maroon transition-transform hover:scale-105"
          >
            Partner with us
          </Link>
        </div>
      </div>
    </section>
  );
}
