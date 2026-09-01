"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSiteContent } from "@/lib/api";

type ApiSlide = {
  mediaType?: string;
  imageUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  link?: string;
  active?: boolean;
  order?: number;
};

type Slide =
  | { kind: "image"; src: string; href: string }
  | { kind: "video"; src: string; href: string }
  | { kind: "youtube"; id: string; href: string };

function youtubeId(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : "";
}

/**
 * Full-width hero — edge-to-edge like kazifarmskitchen.com.
 * Fully admin-managed: it loads `heroSlides` from `/api/site-content` and
 * renders them. There is no hardcoded fallback — the hero stays hidden until
 * the admin adds banners from the dashboard (/admin/banners).
 */
export default function HeroCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  // Load admin-managed banners.
  useEffect(() => {
    getSiteContent()
      .then((data) => {
        const hs: ApiSlide[] = (data?.heroSlides as ApiSlide[]) ?? [];
        const mapped = hs
          .filter((s) => s.active !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((s): Slide | null => {
            if (s.youtubeUrl) return { kind: "youtube", id: youtubeId(s.youtubeUrl), href: s.link || "#" };
            if (s.mediaType === "video" && s.videoUrl) return { kind: "video", src: s.videoUrl, href: s.link || "#" };
            if (s.imageUrl) return { kind: "image", src: s.imageUrl, href: s.link || "#" };
            return null;
          })
          .filter((s): s is Slide => s !== null);
        setSlides(mapped);
        setI(0);
      })
      .catch(() => {});
  }, []);

  const n = slides.length;
  const go = useCallback((next: number) => setI((next + n) % n), [n]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => {
      if (!paused.current) setI((c) => (c + 1) % n);
    }, 5000);
    return () => clearInterval(t);
  }, [n]);

  // No fallback — keep the hero hidden until the admin adds banners.
  if (!n) return null;

  return (
    <section
      className="relative w-full overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      aria-label="Promotions"
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div key={idx} className="w-full shrink-0">
            <div className="relative h-[280px] sm:h-[430px] lg:h-[560px] xl:h-[620px]">
              {s.kind === "image" && (
                <Link href={s.href} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt="" className="h-full w-full object-cover" />
                </Link>
              )}
              {s.kind === "video" && (
                <Link href={s.href} className="block h-full w-full">
                  <video src={s.src} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                </Link>
              )}
              {s.kind === "youtube" && (
                <iframe
                  src={`https://www.youtube.com/embed/${s.id}?rel=0&modestbranding=1`}
                  title="Banner video"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            onClick={() => go(i - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-maroon shadow-lg transition hover:bg-white"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => go(i + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-maroon shadow-lg transition hover:bg-white"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-7 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
