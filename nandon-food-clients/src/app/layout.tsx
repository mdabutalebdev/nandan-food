import type { Metadata } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nandon Foods — Fresh & Frozen Meat, Poultry, Fish & Agro",
    template: "%s | Nandon Foods",
  },
  description:
    "Nandon Foods — a concern of Fardin Meat & Agro Food Ltd. Buy fresh & frozen chicken, beef, fish, duck, eggs and agro products online. 100% Halal, HACCP certified.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${openSans.variable} ${poppins.variable} h-full`} suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla adds
          `cz-shortcut-listen`, Grammarly, etc.) inject attributes on <body>
          before React hydrates — this silences that harmless mismatch only. */}
      <body className="min-h-full bg-page" suppressHydrationWarning>{children}</body>
    </html>
  );
}
