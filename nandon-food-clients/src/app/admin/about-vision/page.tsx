import SingleBlockEditor from "@/components/admin/SingleBlockEditor";

export default function Page() {
  return (
    <SingleBlockEditor
      section="aboutVision"
      heading="Vision"
      sub="The Vision block on the About Us page."
      fields={[
        { key: "title", label: "Heading", type: "text", placeholder: "Vision" },
        { key: "body", label: "Text", type: "textarea", rows: 6, hint: "Leave a blank line between paragraphs." },
      ]}
    />
  );
}
