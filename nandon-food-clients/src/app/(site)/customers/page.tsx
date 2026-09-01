import { redirect } from "next/navigation";

// Customers/Clients now live as a section on the About Us page.
export default function CustomersPage() {
  redirect("/about#clients");
}
