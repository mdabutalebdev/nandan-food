import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="clients"
      heading="Our Clients"
      sub="Client logos shown in the two-row marquee on the About Us page."
      fields={{ title: true }}
      preview="logo"
      labels={{ title: "Client name" }}
      placeholders={{ title: "e.g. Foodpanda" }}
      imageHint="Logo — transparent PNG works best"
      addLabel="Add client"
      activeHint="show in the marquee"
      savedNote="Saved — now live on the About page."
    />
  );
}
