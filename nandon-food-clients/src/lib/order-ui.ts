/** Shared order-status presentation for the storefront (account + tracking). */

export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

export const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700", dot: "#f59e0b" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-700", dot: "#3b82f6" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-700", dot: "#3b82f6" },
  shipped: { label: "Shipped", cls: "bg-indigo-100 text-indigo-700", dot: "#6366f1" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700", dot: "#16a34a" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700", dot: "#dc2626" },
  returned: { label: "Returned", cls: "bg-red-100 text-red-700", dot: "#dc2626" },
};

export function statusMeta(s?: string) {
  return STATUS_META[s ?? ""] ?? { label: s ?? "—", cls: "bg-page text-ink-soft", dot: "#9aa1ac" };
}

/** The happy-path steps shown as a progress tracker. */
export const TRACK_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "pending", label: "Order placed", icon: "M9 11l3 3 8-8M3 7h4l1.5 12.5" },
  { key: "confirmed", label: "Confirmed", icon: "M20 6 9 17l-5-5" },
  { key: "processing", label: "Processing", icon: "M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" },
  { key: "shipped", label: "Shipped", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7z" },
  { key: "delivered", label: "Delivered", icon: "M4 12l5 5L20 6" },
];

/** Index of a status along the tracker (−1 for cancelled/returned/unknown). */
export function stepIndex(status?: string): number {
  return TRACK_STEPS.findIndex((s) => s.key === status);
}

export type StoreOrderItem = {
  _id?: string;
  name: string;
  thumbnail: string;
  price: number;
  quantity: number;
  total: number;
  color?: string;
  size?: string;
  product?: { slug?: string } | string;
};

export type StoreOrder = {
  _id: string;
  orderId: string;
  invoiceNo?: string;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items: StoreOrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode?: string;
  deliveryZone?: string;
  trackingNumber?: string;
  carrier?: string;
  note?: string;
  createdAt?: string;
  shippingAddress?: {
    fullName?: string; phone?: string; email?: string;
    address?: string; area?: string; city?: string; postalCode?: string;
  };
  timeline?: { status: string; note?: string; createdAt?: string }[];
};
