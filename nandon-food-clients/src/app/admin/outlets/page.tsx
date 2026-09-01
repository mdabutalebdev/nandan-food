import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="outlets"
      heading="Outlets"
      sub="Wide 'Franchised Outlets' banners shown on the homepage."
      fields={{ title: true, link: true }}
      preview="wide"
    />
  );
}
