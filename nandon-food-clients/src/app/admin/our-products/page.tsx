import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="productShowcase"
      heading="Our Products"
      sub="Wide product-showcase banners shown in the 'Our Products' section."
      fields={{ title: true, link: true }}
      preview="wide"
    />
  );
}
