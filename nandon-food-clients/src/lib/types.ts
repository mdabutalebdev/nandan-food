// Shared types for the Nandon Foods storefront.

/** A category as returned (flat) by the backend `/api/categories`. */
export interface ApiCategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  parent?: string | { _id: string; name: string; slug: string } | null;
  level?: number;
  order?: number;
  image?: string;
  icon?: string;
  showInMenu?: boolean;
  isActive?: boolean;
  productCount?: number;
}

/** A node in the assembled navigation / category tree. */
export interface MenuNode {
  id: string;
  name: string;
  href: string;
  image?: string;
  icon?: string;
  /** Highlight (e.g. the "Product by category" mega item). */
  mega?: boolean;
  children?: MenuNode[];
}

export interface HeroSlide {
  id?: string;
  imageUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  mediaType?: "image" | "video";
  link?: string;
  title?: string;
  subtitle?: string;
}

/** A populated category reference on a product ({ _id, name, slug }). */
export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
}

/** A product variant (colour / size combo with its own price + stock). */
export interface ProductVariant {
  _id?: string;
  label?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  note?: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  stock?: number;
  images?: string[];
}

/** A product as returned by `/api/products`. */
export interface Product {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  tagline?: string;
  price: number;
  originalPrice?: number | null;
  discount?: number;
  discountedPrice?: number;
  thumbnail: string;
  images?: string[];
  category?: CategoryRef | string | null;
  subcategory?: CategoryRef | string | null;
  brand?: string;
  flags?: string[];
  variants?: ProductVariant[];
  stock?: number;
  status?: string;
  visibility?: string;
  deliveryInfo?: string;
  paymentInfo?: string;
  termsInfo?: string;
  rating?: number;
  reviewCount?: number;
  totalSold?: number;
}

/** Pagination + facet meta returned alongside a product list. */
export interface ProductListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  minPrice?: number;
  maxPrice?: number;
}

/** One line in the shopping cart (persisted to localStorage). */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  thumbnail: string;
  price: number;
  quantity: number;
  variantId?: string;
  color?: string;
  size?: string;
  stock?: number;
}

/** A product review. */
export interface Review {
  _id: string;
  name?: string;
  userName?: string;
  rating: number;
  comment?: string;
  review?: string;
  createdAt?: string;
  likeCount?: number;
}

/* ── About Us page content (admin-managed via site-content) ─────────── */

/** A card in the Management / Clients / Certifications grids. */
export interface AboutCard {
  _id?: string;
  imageUrl: string;
  title?: string;        // management: member name · certifications: caption
  description?: string;  // management: designation
  link?: string;
  active?: boolean;
  order?: number;
}

/** The "About" intro block — left text, right image. */
export interface AboutIntro {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
}

/** A simple text block (Mission / Vision) with an optional image. */
export interface AboutTextBlock {
  title?: string;
  body?: string;
  imageUrl?: string;
}

/** The owner / management message block. */
export interface OwnerMessage {
  title?: string;
  name?: string;
  designation?: string;
  message?: string;
  imageUrl?: string;
}

/** Everything the /about page renders, all admin-managed. */
export interface AboutContent {
  aboutIntro?: AboutIntro;
  aboutMission?: AboutTextBlock;
  aboutVision?: AboutTextBlock;
  ownerMessage?: OwnerMessage;
  management?: AboutCard[];
  clients?: AboutCard[];
  certifications?: AboutCard[];
}

/** Result of validating a coupon at checkout. */
export interface CouponResult {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discount: number;
  maxDiscount?: number | null;
  minOrderAmount?: number;
}
