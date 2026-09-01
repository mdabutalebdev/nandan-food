/**
 * Brand glyphs for the social links, shared by the footer and the admin
 * Social Links page so both always show the same icon for a platform.
 *
 * Every glyph is drawn from simple primitives on a 24×24 grid — no icon
 * dependency, and they stay crisp at the 16–20px sizes we use.
 */

export const SOCIAL_PLATFORMS = [
  { platform: "facebook", label: "Facebook", color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
  { platform: "instagram", label: "Instagram", color: "#E1306C", placeholder: "https://instagram.com/yourpage" },
  { platform: "youtube", label: "YouTube", color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
  { platform: "linkedin", label: "LinkedIn", color: "#0A66C2", placeholder: "https://linkedin.com/company/yourpage" },
  { platform: "tiktok", label: "TikTok", color: "#111111", placeholder: "https://tiktok.com/@yourpage" },
  { platform: "x", label: "X (Twitter)", color: "#000000", placeholder: "https://x.com/yourpage" },
  { platform: "whatsapp", label: "WhatsApp", color: "#25D366", placeholder: "https://wa.me/8801XXXXXXXXX" },
  { platform: "telegram", label: "Telegram", color: "#229ED9", placeholder: "https://t.me/yourchannel" },
  { platform: "pinterest", label: "Pinterest", color: "#E60023", placeholder: "https://pinterest.com/yourpage" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["platform"] | "custom";

export function platformMeta(platform: string) {
  return (
    SOCIAL_PLATFORMS.find((p) => p.platform === platform) ?? {
      platform: "custom",
      label: "Custom link",
      color: "#6f6f6f",
      placeholder: "https://",
    }
  );
}

/** The glyph only — colour comes from `currentColor`, size from the wrapper. */
export default function SocialIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  const common = { viewBox: "0 0 24 24", className, "aria-hidden": true } as const;

  switch (platform) {
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.6 21v-7.5h2.5l.4-2.9h-2.9V8.7c0-.8.2-1.4 1.4-1.4h1.6V4.7c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.1H8v2.9h2.5V21h3.1z" />
        </svg>
      );

    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="3" width="18" height="18" rx="5.2" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );

    case "youtube":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.6 7.4a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.4 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.6 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.6zM10.1 14.9V9.1L15 12l-4.9 2.9z" />
        </svg>
      );

    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4.5 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM3 8.4h3V21H3V8.4zM9 8.4h2.9v1.7h.1c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8V21h-3v-5.9c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9V8.4z" />
        </svg>
      );

    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M15.6 3h-2.8v12.1a2.3 2.3 0 1 1-1.9-2.3v-2.9a5.2 5.2 0 1 0 4.7 5.2V9a6.5 6.5 0 0 0 3.7 1.2V7.4a3.8 3.8 0 0 1-3.7-3.7V3z" />
        </svg>
      );

    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.5 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2.3 3h6.4l4.4 5.9L17.5 3zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3z" />
        </svg>
      );

    case "whatsapp":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20zm4.5-5.9c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.8c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.6 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
        </svg>
      );

    case "telegram":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.5 4.3 2.9 11.4c-.9.4-.9.9-.2 1.1l4.7 1.5 1.8 5.5c.2.6.4.6 1 .1l2.5-2.2 4.8 3.6c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.2-.4-1.7-1.2-1.4zM8.6 13.9l9.1-5.7c.4-.3.8-.1.5.2l-7.6 6.9-.3 3-1.7-4.4z" />
        </svg>
      );

    case "pinterest":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a10 10 0 0 0-3.7 19.3 9.6 9.6 0 0 1 .1-2.4l1.3-5.4a3.6 3.6 0 0 1-.3-1.5c0-1.4.8-2.4 1.8-2.4a1.3 1.3 0 0 1 1.3 1.4 20 20 0 0 1-.8 3.3 1.5 1.5 0 0 0 1.5 1.8c1.8 0 3.1-2 3.1-4.7a4 4 0 0 0-4.3-4.2 4.5 4.5 0 0 0-4.7 4.5 2.7 2.7 0 0 0 .5 1.6c.1.2.2.3.1.5l-.2.8c0 .3-.2.3-.5.2-1.3-.6-2-2.4-2-3.9 0-3.2 2.3-6.1 6.7-6.1a5.9 5.9 0 0 1 6.2 5.8c0 3.5-2.2 6.3-5.2 6.3a2.7 2.7 0 0 1-2.3-1.2l-.6 2.4a11 11 0 0 1-1.3 2.7A10 10 0 1 0 12 2z" />
        </svg>
      );

    default:
      // Generic "link" glyph for a custom network.
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M10 13a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 4.9" />
          <path d="M14 11a5 5 0 0 0-7.1 0l-2.4 2.4a5 5 0 0 0 7.1 7.1l1.4-1.4" />
        </svg>
      );
  }
}
