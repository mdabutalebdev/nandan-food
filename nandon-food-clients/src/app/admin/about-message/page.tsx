import SingleBlockEditor from "@/components/admin/SingleBlockEditor";

export default function Page() {
  return (
    <SingleBlockEditor
      section="ownerMessage"
      heading="Message"
      sub="Owner / management message — image on the left, message on the right."
      fields={[
        { key: "imageUrl", label: "Photo (left side)", type: "image", hint: "Portrait works best (e.g. 600×750)" },
        { key: "name", label: "Name", type: "text", placeholder: "e.g. Md Lokman Hossain" },
        { key: "designation", label: "Designation", type: "text", placeholder: "e.g. Chairman" },
        { key: "message", label: "Message", type: "textarea", rows: 8, hint: "Leave a blank line between paragraphs." },
      ]}
    />
  );
}
