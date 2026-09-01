/** Reusable page banner used by the storefront's content pages. */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="frame pt-7 pb-1 text-center lg:pt-9">
      {eyebrow && (
        <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-dark">
          {eyebrow}
        </span>
      )}
      <h1 className="mt-2.5 font-display text-2xl font-extrabold text-ink lg:text-3xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-1.5 max-w-2xl text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}
