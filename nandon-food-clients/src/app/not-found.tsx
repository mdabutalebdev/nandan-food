import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="frame flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-tint text-brand">
        <Compass size={36} strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-maroon">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        The page you&apos;re looking for isn&apos;t here. Explore our fresh &amp;
        frozen products or get in touch with us.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Back to home
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-maroon px-6 py-2.5 text-sm font-bold text-maroon transition-colors hover:bg-maroon-tint"
        >
          Shop products
        </Link>
      </div>
    </div>
  );
}
