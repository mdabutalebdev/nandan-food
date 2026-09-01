import type { ApiCategory, Product, ProductListMeta, Review } from "./types";
import { buildCategoryTree, FALLBACK_CATEGORY_TREE } from "./menu";
import type { MenuNode } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

/** Small typed GET that never throws — returns null on any failure. */
async function get<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}

/** Read the stored access token (client-side only). */
export function getToken(): string | null {
  try {
    return localStorage.getItem("nandon_token");
  } catch {
    return null;
  }
}

/** Authenticated GET (adds Bearer token). Returns null on any failure. */
export async function authGet<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}

/** Authenticated JSON send (POST/PUT/PATCH/DELETE). */
export async function authSend<T = unknown>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; data?: T; message?: string }> {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json?.success !== false, data: json?.data, message: json?.message };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/**
 * Fetch the whole site-content doc once and share it between all callers on a
 * page (hero, health promises, showcases…). Memoised so 4 sections = 1 request.
 */
let _sitePromise: Promise<Record<string, unknown> | null> | null = null;
export function getSiteContent(): Promise<Record<string, unknown> | null> {
  if (!_sitePromise) {
    _sitePromise = fetch(`${API_BASE}/site-content`)
      .then((r) => r.json())
      .then((j) => (j?.data ?? j) as Record<string, unknown>)
      .catch(() => null);
  }
  return _sitePromise;
}

/** Read the whole About-Us page content (intro, mission, vision, message,
 *  management, clients, certifications) from the shared site-content doc. */
export async function getAboutContent(): Promise<import("./types").AboutContent> {
  const s = (await getSiteContent()) || {};
  const arr = (v: unknown) => (Array.isArray(v) ? (v as import("./types").AboutCard[]) : []);
  return {
    aboutIntro: (s.aboutIntro as import("./types").AboutIntro) || {},
    aboutMission: (s.aboutMission as import("./types").AboutTextBlock) || {},
    aboutVision: (s.aboutVision as import("./types").AboutTextBlock) || {},
    ownerMessage: (s.ownerMessage as import("./types").OwnerMessage) || {},
    management: arr(s.management).filter((c) => c.active !== false),
    clients: arr(s.clients).filter((c) => c.active !== false),
    certifications: arr(s.certifications).filter((c) => c.active !== false),
  };
}

/** Fetch a single editable content page (about / refund / terms…) by slug. */
export async function getLegalPage(
  slug: string,
  signal?: AbortSignal,
): Promise<{ title: string; content: string } | null> {
  return get<{ title: string; content: string }>(`/site-content/legal/${slug}`, signal);
}

/** Upload a single image (admin). Returns the public URL or null. */
export async function uploadImage(file: File): Promise<string | null> {
  const token = getToken();
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: fd,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the live category tree from the backend.
 * Falls back to the static tree (from the brief image) when the API is
 * unreachable or returns nothing, so the menu always renders.
 */
export async function fetchCategoryTree(signal?: AbortSignal): Promise<MenuNode[]> {
  const cats = await get<ApiCategory[]>("/categories", signal);
  if (!cats || !Array.isArray(cats) || cats.length === 0) {
    return FALLBACK_CATEGORY_TREE;
  }
  const tree = buildCategoryTree(cats);
  return tree.length ? tree : FALLBACK_CATEGORY_TREE;
}

/** Raw flat category list from the backend (for slug → id resolution). */
export async function getCategories(signal?: AbortSignal): Promise<ApiCategory[]> {
  const cats = await get<ApiCategory[]>("/categories", signal);
  return Array.isArray(cats) ? cats : [];
}

/**
 * Fetch a page of products. `params` map to backend query filters
 * (categoryIds, subcategory, searchTerm, flag, brand, sort, page, limit,
 * minPrice/maxPrice…). Returns products + pagination meta.
 */
export async function getProducts(
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<{ products: Product[]; meta: ProductListMeta }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  }
  try {
    const res = await fetch(`${API_BASE}/products?${qs.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { products: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
    const json = await res.json();
    return {
      products: (json?.data ?? []) as Product[],
      meta: (json?.meta ?? { page: 1, limit: 0, total: 0, totalPages: 0 }) as ProductListMeta,
    };
  } catch {
    return { products: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
  }
}

/** Fetch one product by its slug. */
export function getProductBySlug(slug: string, signal?: AbortSignal): Promise<Product | null> {
  return get<Product>(`/products/slug/${encodeURIComponent(slug)}`, signal);
}

/** Fetch related products (same category). */
export async function getRelatedProducts(
  id: string,
  categoryId: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<Product[]> {
  const data = await get<Product[]>(`/products/${id}/related/${categoryId}?limit=${limit}`, signal);
  return Array.isArray(data) ? data : [];
}

/** Public list of reviews for a product. */
export async function getProductReviews(productId: string, signal?: AbortSignal): Promise<Review[]> {
  const data = await get<Review[]>(`/reviews/product/${productId}`, signal);
  return Array.isArray(data) ? data : [];
}

/** Submit a review (public — no login required). */
export async function submitReview(payload: {
  product: string;
  rating: number;
  name: string;
  comment: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await authSend("/reviews/public", "POST", payload);
  return { ok: res.ok, message: res.message };
}

/** Validate a coupon against a subtotal. Works for guests. */
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<{ ok: boolean; data?: { discount: number; coupon?: { code: string } }; message?: string }> {
  return authSend<{ discount: number; coupon?: { code: string } }>("/coupons/validate", "POST", {
    code,
    orderAmount: subtotal,
  });
}

/** Upload a CV (pdf / doc / docx). Public — returns { url, name } or null. */
export async function uploadCv(file: File): Promise<{ url: string; name: string } | null> {
  const fd = new FormData();
  fd.append("cv", file);
  try {
    const res = await fetch(`${API_BASE}/upload/cv`, { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.url ? { url: json.data.url, name: json.data.name || "CV" } : null;
  } catch {
    return null;
  }
}

/** Submit a job application from the career page (public). */
export async function submitApplication(payload: {
  jobTitle?: string;
  name: string;
  phone: string;
  email?: string;
  cvUrl?: string;
  coverLetter?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await authSend("/applications", "POST", payload);
  return { ok: res.ok, message: res.message };
}

/** Submit a general inquiry / contact-form message (public). */
export async function submitInquiry(payload: {
  type?: "contact" | "rfq" | "expert";
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await authSend("/inquiries", "POST", { type: "contact", ...payload });
  return { ok: res.ok, message: res.message };
}

/** Place an order. Uses guest-checkout when the shopper isn't logged in. */
export async function placeOrder(payload: unknown): Promise<{ ok: boolean; data?: { orderId?: string; _id?: string }; message?: string }> {
  const path = getToken() ? "/orders" : "/orders/guest-checkout";
  return authSend<{ orderId?: string; _id?: string }>(path, "POST", payload);
}

/* ── Customer account (logged-in shopper) ─────────────────────────── */

/** The signed-in customer's own orders. */
export async function getMyOrders(signal?: AbortSignal) {
  const data = await authGet<unknown[]>("/orders/my?limit=100", signal);
  return Array.isArray(data) ? data : [];
}

/** One of the customer's own orders (backend scopes it to the owner). */
export function getMyOrder(id: string, signal?: AbortSignal) {
  return authGet<Record<string, unknown>>(`/orders/${id}`, signal);
}

/** Cancel one of my orders (only while pending / confirmed). */
export function cancelMyOrder(id: string) {
  return authSend(`/orders/${id}/cancel`, "PATCH");
}

/** Read my profile fresh from the server. */
export function getMyProfile(signal?: AbortSignal) {
  return authGet<Record<string, unknown>>("/users/me", signal);
}

/** Update my name / phone / email. */
export function updateMyProfile(body: { firstName?: string; lastName?: string; phone?: string; email?: string }) {
  return authSend<Record<string, unknown>>("/users/me", "PATCH", body);
}

/** Change my password. */
export function changeMyPassword(currentPassword: string, newPassword: string) {
  return authSend("/auth/update-password", "POST", { currentPassword, newPassword });
}

/** Track any order by its ID + phone (works for guests too). */
export function trackOrder(orderId: string, phone: string) {
  return authSend<Record<string, unknown>>("/orders/track", "POST", { orderId, phone });
}

/* ── Saved shipping addresses ─────────────────────────────────────── */
export async function getMyAddresses(signal?: AbortSignal) {
  const data = await authGet<unknown[]>("/users/addresses", signal);
  return Array.isArray(data) ? data : [];
}
export function addMyAddress(body: unknown) {
  return authSend("/users/addresses", "POST", body);
}
export function updateMyAddress(id: string, body: unknown) {
  return authSend(`/users/addresses/${id}`, "PATCH", body);
}
export function deleteMyAddress(id: string) {
  return authSend(`/users/addresses/${id}`, "DELETE");
}
