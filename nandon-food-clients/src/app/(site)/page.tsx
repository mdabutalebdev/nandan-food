import HeroCarousel from "@/components/home/HeroCarousel";
import HealthPromises from "@/components/home/HealthPromises";
import CategoryStrip from "@/components/home/CategoryStrip";
import WideBannerSection from "@/components/home/WideBannerSection";

export default function Home() {
  return (
    <>
      <HeroCarousel />
      <HealthPromises />
      <CategoryStrip />
      <WideBannerSection section="productShowcase" eyebrow="What we offer" heading="Our Products" />
      <WideBannerSection section="outlets" eyebrow="Visit us" heading="Franchised Outlets" />
      <WideBannerSection section="exportBrochure" eyebrow="Global reach" heading="Export Brochure" />
    </>
  );
}
