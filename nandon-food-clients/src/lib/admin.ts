/**
 * Admin API surface — every call the admin panel makes, in one place.
 * Everything here needs an admin bearer token; `authGet` / `authSend` add it.
 */

import { API_BASE, authGet, authSend, getToken } from "./api";
import type { Product, ApiCategory } from "./types";

/* ── Shared shapes ────────────────────────────────────────────────── */

export type Paged<T> = { rows: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export type SalesChannel = "online" | "corporate" | "direct";

export const SALES_CHANNELS: { value: SalesChannel; label: string; hint: string }[] = [
  { value: "online", label: "Online Sales", hint: "Placed by a customer on the website" },
  { value: "corporate", label: "Corporate Sales", hint: "Company / bulk buyer with an invoice" },
  { value: "direct", label: "Direct Sales", hint: "Walk-in, phone or counter sale" },
];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["cod", "bkash", "nagad", "rocket", "cash", "bank", "cheque", "credit"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export type OrderItem = {
  _id?: string;
  product?: string | { _id: string; name?: string; thumbnail?: string; slug?: string };
  name: string;
  thumbnail: string;
  price: number;
  quantity: number;
  total: number;
  color?: string;
  size?: string;
  variantId?: string;
};

export type Address = {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  area?: string;
  city?: string;
  postalCode?: string;
};

export type Corporate = {
  companyName?: string;
  contactPerson?: string;
  designation?: string;
  binNo?: string;
  tinNo?: string;
  poNumber?: string;
};

export type AdminOrder = {
  _id: string;
  orderId: string;
  invoiceNo?: string;
  invoiceDate?: string;
  salesChannel?: SalesChannel;
  orderSource?: "website" | "admin";
  corporate?: Corporate;
  user?: { _id?: string; firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  shippingCost: number;
  deliveryZone?: string;
  discount: number;
  manualDiscount?: number;
  vat?: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  couponCode?: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;
  paymentDetails?: { senderNumber?: string; transactionId?: string; paymentTime?: string };
  trackingNumber?: string;
  carrier?: string;
  note?: string;
  timeline?: { status: string; note?: string; createdAt?: string }[];
  createdAt?: string;
};

export type AdminCategory = ApiCategory & {
  _id: string;
  description?: string;
  banner?: string;
  isFeatured?: boolean;
  showInHome?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
};

export type Coupon = {
  _id?: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number | null;
  usedCount?: number;
  expiresAt: string;
  isActive?: boolean;
  createdAt?: string;
};

export type InventoryItem = {
  _id: string;
  name: string;
  code?: string;
  unit: string;
  group?: string;
  openingStock?: number;
  openingRate?: number;
  stock: number;
  avgCost: number;
  lastPurchasePrice?: number;
  lowStockAlert?: number;
  supplier?: string;
  note?: string;
  isActive?: boolean;
  stockValue?: number;
  totalPurchasedQty?: number;
  totalPurchasedValue?: number;
  totalConsumedQty?: number;
  totalConsumedValue?: number;
};

export type InventoryTxn = {
  _id: string;
  item: string | { _id: string; name: string; unit: string; group?: string };
  itemName: string;
  unit: string;
  type: "purchase" | "consume" | "adjust";
  quantity: number;
  unitPrice: number;
  totalCost: number;
  supplier?: string;
  invoiceNo?: string;
  purpose?: string;
  reference?: string;
  date: string;
  note?: string;
  stockAfter?: number;
};

export const INVENTORY_UNITS = [
  "kg", "gram", "litre", "ml", "pcs", "packet", "dozen", "bag", "carton", "box", "bundle", "feet", "meter", "other",
];

export type DeliveryZone = {
  _id?: string;
  name: string;
  charge: number;
  note?: string;
  isDefault?: boolean;
  active?: boolean;
  order?: number;
};

export type SocialLink = {
  _id?: string;
  platform: string;
  label: string;
  url: string;
  color: string;
  active: boolean;
  order: number;
};

export type AdminUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt?: string;
};

/* ── Query-string helper ──────────────────────────────────────────── */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") s.set(k, String(v));
  }
  const out = s.toString();
  return out ? `?${out}` : "";
}

/* ── Products ─────────────────────────────────────────────────────── */
export async function adminGetProducts(params: Record<string, string | number | undefined>) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/products${qs(params)}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    return {
      rows: (json?.data ?? []) as Product[],
      meta: (json?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as Paged<Product>["meta"],
    };
  } catch {
    return { rows: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

export const adminGetProduct = (id: string) => authGet<Product>(`/products/${id}`);
export const adminCreateProduct = (body: unknown) => authSend<Product>("/products", "POST", body);
export const adminUpdateProduct = (id: string, body: unknown) => authSend<Product>(`/products/${id}`, "PATCH", body);
export const adminDeleteProduct = (id: string) => authSend(`/products/${id}`, "DELETE");
export const adminBulkProductStatus = (ids: string[], status: string) =>
  authSend("/products/admin/bulk-status", "PATCH", { ids, status });
export const adminBulkDeleteProducts = (ids: string[]) =>
  authSend("/products/admin/bulk-delete", "DELETE", { ids });

/* ── Categories ───────────────────────────────────────────────────── */
export const adminGetCategories = () => authGet<AdminCategory[]>("/categories/admin/all");
export const adminCreateCategory = (body: unknown) => authSend<AdminCategory>("/categories", "POST", body);
export const adminUpdateCategory = (id: string, body: unknown) => authSend<AdminCategory>(`/categories/${id}`, "PATCH", body);
export const adminDeleteCategory = (id: string) => authSend(`/categories/${id}`, "DELETE");

/* ── Orders ───────────────────────────────────────────────────────── */
export async function adminGetOrders(params: Record<string, string | number | undefined>) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/orders/admin/all${qs(params)}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    return {
      rows: (json?.data?.rows ?? []) as AdminOrder[],
      summary: (json?.data?.summary ?? { revenue: 0, paid: 0, count: 0 }) as { revenue: number; paid: number; count: number },
      meta: (json?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as Paged<AdminOrder>["meta"],
    };
  } catch {
    return { rows: [], summary: { revenue: 0, paid: 0, count: 0 }, meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

export const adminGetOrder = (id: string) => authGet<AdminOrder>(`/orders/admin/${id}`);
export const adminOrderStats = () => authGet<Record<string, unknown>>("/orders/admin/stats");
export const adminCreateManualOrder = (body: unknown) => authSend<AdminOrder>("/orders/admin/manual", "POST", body);
export const adminUpdateOrder = (id: string, body: unknown) => authSend<AdminOrder>(`/orders/admin/${id}`, "PATCH", body);
export const adminUpdateOrderStatus = (id: string, status: string, note?: string) =>
  authSend<AdminOrder>(`/orders/admin/${id}/status`, "PATCH", { status, note });
export const adminUpdatePaymentStatus = (id: string, paymentStatus: string) =>
  authSend<AdminOrder>(`/orders/admin/${id}/payment`, "PATCH", { paymentStatus });
export const adminAddOrderNote = (id: string, note: string) =>
  authSend<AdminOrder>(`/orders/admin/${id}/note`, "PATCH", { note });
export const adminDeleteOrder = (id: string) => authSend(`/orders/admin/${id}`, "DELETE");

/* ── Coupons ──────────────────────────────────────────────────────── */
export const adminGetCoupons = () => authGet<Coupon[]>("/coupons");
export const adminCreateCoupon = (body: unknown) => authSend<Coupon>("/coupons", "POST", body);
export const adminUpdateCoupon = (id: string, body: unknown) => authSend<Coupon>(`/coupons/${id}`, "PATCH", body);
export const adminDeleteCoupon = (id: string) => authSend(`/coupons/${id}`, "DELETE");

/* ── Inventory ────────────────────────────────────────────────────── */
export const invGetItems = (params: Record<string, string | undefined> = {}) =>
  authGet<InventoryItem[]>(`/inventory/items${qs(params)}`);
export const invCreateItem = (body: unknown) => authSend<InventoryItem>("/inventory/items", "POST", body);
export const invUpdateItem = (id: string, body: unknown) => authSend<InventoryItem>(`/inventory/items/${id}`, "PATCH", body);
export const invDeleteItem = (id: string) => authSend(`/inventory/items/${id}`, "DELETE");

export async function invGetTransactions(params: Record<string, string | number | undefined>) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/inventory/transactions${qs(params)}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    return {
      rows: (json?.data?.rows ?? []) as InventoryTxn[],
      summary: (json?.data?.summary ?? {}) as Record<string, number>,
      meta: (json?.meta ?? { page: 1, limit: 25, total: 0, totalPages: 0 }) as Paged<InventoryTxn>["meta"],
    };
  } catch {
    return { rows: [], summary: {}, meta: { page: 1, limit: 25, total: 0, totalPages: 0 } };
  }
}

export const invCreateTxn = (body: unknown) => authSend("/inventory/transactions", "POST", body);
export const invUpdateTxn = (id: string, body: unknown) => authSend(`/inventory/transactions/${id}`, "PATCH", body);
export const invDeleteTxn = (id: string) => authSend(`/inventory/transactions/${id}`, "DELETE");
export const invStats = (params: Record<string, string | undefined> = {}) =>
  authGet<Record<string, never> & {
    totalItems: number; activeItems: number; stockValue: number;
    purchaseValue: number; purchaseCount: number; consumeValue: number; consumeCount: number;
    lowStockCount: number; lowStockItems: { _id: string; name: string; unit: string; stock: number; lowStockAlert: number }[];
  }>(`/inventory/stats${qs(params)}`);
export const invReport = (params: Record<string, string | undefined> = {}) =>
  authGet<{
    rows: (InventoryItem & { purchaseQty: number; purchaseValue: number; consumeQty: number; consumeValue: number; stockValue: number })[];
    totals: { purchaseValue: number; consumeValue: number; stockValue: number };
  }>(`/inventory/report${qs(params)}`);

/* ── Settings (site content) ──────────────────────────────────────── */
export type SiteContent = Record<string, unknown>;
export const adminGetSettings = () => authGet<SiteContent>("/site-content");
export const adminUpdateSettings = (body: unknown) => authSend<SiteContent>("/site-content", "PUT", body);
export const adminUpdateSection = (section: string, data: unknown) =>
  authSend<SiteContent>(`/site-content/${section}`, "PATCH", data);

/** Social links live under `contact.socials`; the dotted path saves just that list. */
export const adminSaveSocialLinks = (links: SocialLink[]) =>
  authSend<SiteContent>("/site-content/contact.socials", "PATCH", links);

/* ── Reports ──────────────────────────────────────────────────────── */
export type SalesReport = {
  summary: {
    orders: number; revenue: number; subtotal: number; discount: number;
    shipping: number; paid: number; due: number; items: number; avgOrderValue: number;
  };
  daily: { date: string; revenue: number; orders: number }[];
  byChannel: { _id: string; revenue: number; orders: number }[];
  byStatus: { _id: string; revenue: number; orders: number }[];
  byPayment: { _id: string; revenue: number; orders: number }[];
  topProducts: { _id: string; name: string; thumbnail?: string; qty: number; revenue: number }[];
  byCategory: { _id: string; name: string; revenue: number; qty: number }[];
};

export const getSalesReport = (params: Record<string, string | undefined>) =>
  authGet<SalesReport>(`/analytics/sales-report${qs(params)}`);
export const getTopCustomers = (params: Record<string, string | number | undefined>) =>
  authGet<{ _id: string; name: string; company?: string; orders: number; revenue: number; lastOrder: string }[]>(
    `/analytics/top-customers${qs(params)}`,
  );

/* ── Customers ────────────────────────────────────────────────────── */
export async function adminGetUsers(params: Record<string, string | number | undefined>) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/users/admin/all${qs(params)}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    return {
      rows: (json?.data ?? []) as AdminUser[],
      meta: (json?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as Paged<AdminUser>["meta"],
    };
  } catch {
    return { rows: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

export const adminUpdateUserStatus = (id: string, status: string) =>
  authSend(`/users/admin/${id}/status`, "PATCH", { status });
export const adminDeleteUser = (id: string) => authSend(`/users/admin/${id}`, "DELETE");

/* ── Job Applications (career "Apply now") ────────────────────────── */
export const APPLICATION_STATUSES = ["new", "reviewed", "shortlisted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type JobApplication = {
  _id: string;
  jobTitle?: string;
  name: string;
  phone: string;
  email?: string;
  cvUrl?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  createdAt?: string;
};

export async function adminGetApplications(params: Record<string, string | number | undefined>) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/applications${qs(params)}`, {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const json = await res.json();
    return {
      rows: (json?.data?.rows ?? []) as JobApplication[],
      summary: (json?.data?.summary ?? {}) as Record<string, number>,
      meta: (json?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as Paged<JobApplication>["meta"],
    };
  } catch {
    return { rows: [], summary: {}, meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}

export const adminUpdateApplicationStatus = (id: string, status: string) =>
  authSend<JobApplication>(`/applications/${id}/status`, "PATCH", { status });
export const adminDeleteApplication = (id: string) => authSend(`/applications/${id}`, "DELETE");

/* ── Content pages (legal: refund / terms / privacy / about / faq) ── */
export type LegalPage = { slug: string; title: string; content: string; active?: boolean; lastUpdated?: string };
export const adminUpdateLegalPage = (slug: string, body: { title?: string; content?: string; active?: boolean }) =>
  authSend<LegalPage>(`/site-content/legal/${slug}`, "PUT", body);
