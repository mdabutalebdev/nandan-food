import SingleBlockEditor from "@/components/admin/SingleBlockEditor";

export default function Page() {
  return (
    <SingleBlockEditor
      section="aboutIntro"
      heading="About — Intro"
      sub="The top of the About Us page: text on the left, image on the right."
      fields={[
        { key: "eyebrow", label: "Eyebrow (small label above the title)", type: "text", placeholder: "Who we are" },
        { key: "title", label: "Title", type: "text", placeholder: "About Nandon Foods" },
        { key: "body", label: "Body", type: "textarea", rows: 8, hint: "Leave a blank line between paragraphs." },
        { key: "imageUrl", label: "Image (right side)", type: "image", hint: "e.g. 800×600" },
      ]}
    />
  );
}
