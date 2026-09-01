import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="certifications"
      heading="Certifications"
      sub="Certificate cards on the About Us page — click opens a zoom popup."
      fields={{ title: true }}
      preview="card"
      labels={{ title: "Caption" }}
      placeholders={{ title: "e.g. ISO 9001:2015" }}
      imageHint="Certificate image — portrait (e.g. 600×800)"
      addLabel="Add certificate"
      activeHint="show in the grid"
      savedNote="Saved — now live on the About page."
    />
  );
}
