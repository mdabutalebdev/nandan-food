import SectionManager from "@/components/admin/SectionManager";

export default function Page() {
  return (
    <SectionManager
      section="healthPromises"
      heading="Health Promises"
      sub="The 'Our Health Promises' cards shown on the homepage."
      fields={{ title: true, description: true }}
      preview="card"
    />
  );
}
