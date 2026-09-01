import { redirect } from "next/navigation";

// Certifications now live as a section on the About Us page.
export default function CertificationsPage() {
  redirect("/about#certifications");
}
