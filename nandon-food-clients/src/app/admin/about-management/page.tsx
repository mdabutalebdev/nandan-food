import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="management"
      heading="Our Management"
      sub="Team member cards shown in the slider on the About Us page."
      fields={{ title: true, description: true }}
      preview="card"
      labels={{ title: "Name", description: "Designation" }}
      placeholders={{ title: "e.g. Md Lokman Hossain", description: "e.g. Chairman" }}
      imageHint="Portrait photo (e.g. 600×750)"
      addLabel="Add member"
      activeHint="show in the slider"
      savedNote="Saved — now live on the About page."
    />
  );
}
