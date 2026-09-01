import SingleBlockEditor from "@/components/admin/SingleBlockEditor";

export default function Page() {
  return (
    <SingleBlockEditor
      section="aboutMission"
      heading="Mission"
      sub="The Mission block on the About Us page."
      fields={[
        { key: "title", label: "Heading", type: "text", placeholder: "Mission" },
        { key: "body", label: "Text", type: "textarea", rows: 6, hint: "Leave a blank line between paragraphs." },
      ]}
    />
  );
}
