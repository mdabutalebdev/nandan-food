import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="exportBrochure"
      heading="Export Brochure"
      sub="The wide 'Export Brochure' banner (world-map style) shown near the bottom of the homepage."
      fields={{ title: true, link: true }}
      preview="wide"
    />
  );
}
