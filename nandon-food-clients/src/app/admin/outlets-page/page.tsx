import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="outletList"
      heading="Outlets"
      sub="Photos shown on the Outlets page. Title is optional — upload just an image, or an image with a caption."
      fields={{ title: true }}
      preview="card"
      labels={{ title: "Outlet name / caption" }}
      placeholders={{ title: "e.g. Dhanmondi Outlet" }}
      imageHint="Outlet photo (e.g. 800×600)"
      addLabel="Add outlet"
      activeHint="show on the Outlets page"
      savedNote="Saved — now live on the Outlets page."
    />
  );
}
