import { redirect } from "next/navigation";

// Management now lives as a section on the About Us page.
export default function ManagementPage() {
  redirect("/about#management");
}
