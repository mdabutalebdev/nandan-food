import type { ApiCategory, MenuNode } from "./types";

/** Kebab-case slug from a label. */
export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const cat = (name: string, children?: MenuNode[]): MenuNode => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    href: `/category/${slug}`,
    ...(children && children.length ? { children } : {}),
  };
};

/**
 * Static fallback category tree — exactly the structure from the brief image.
 * Used until the backend `/api/categories` is reachable & seeded, after which
 * the same shape is built live from admin data (see buildCategoryTree).
 */
export const FALLBACK_CATEGORY_TREE: MenuNode[] = [
  cat("Chicken", [cat("Live chicken"), cat("Processed chicken")]),
  cat("Beef", [
    cat("Live cattle"),
    cat("Process beef", [cat("Primal cuts")]),
  ]),
  cat("Fish", [cat("Culture fish"), cat("Capture fish")]),
  cat("Duck", [cat("Deshi patihas")]),
  cat("Agro product"),
  cat("Egg"),
  cat("Frozen product", [
    cat("Chicken product"),
    cat("Beef product"),
    cat("Fish product"),
    cat("Vegetable product"),
  ]),
];

/** Static pages that sit alongside "Product by category" in the top nav.
 *  "About us" is a single link → the /about page holds every section
 *  (About, Mission, Vision, Message, Management, Clients, Certifications)
 *  one after another, all admin-managed via Site Content → About Page. */
export const STATIC_NAV: MenuNode[] = [
  { id: "home", name: "Home", href: "/" },
  { id: "outlets", name: "Outlets", href: "/outlets" },
  { id: "about", name: "About us", href: "/about" },
  { id: "contact", name: "Contact us", href: "/contact" },
  { id: "career", name: "Career", href: "/career" },
  { id: "return-policy", name: "Return policy", href: "/return-policy" },
];

/** Assemble the full top-nav from a category tree. */
export const buildNav = (categoryTree: MenuNode[]): MenuNode[] => [
  STATIC_NAV[0], // Home
  {
    id: "product-by-category",
    name: "Product by category",
    href: "/products",
    mega: true,
    children: categoryTree,
  },
  ...STATIC_NAV.slice(1),
];

/**
 * Turn the backend's flat category list into a nested MenuNode tree,
 * honouring parent / order / showInMenu.
 */
export function buildCategoryTree(flat: ApiCategory[]): MenuNode[] {
  const parentId = (c: ApiCategory): string | null => {
    if (!c.parent) return null;
    return typeof c.parent === "string" ? c.parent : c.parent._id;
  };

  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];
  const visible = flat.filter((c) => c.showInMenu !== false && c.isActive !== false);

  // First pass: create nodes.
  for (const c of visible) {
    const id = c.id || c._id || c.slug;
    nodes.set(id, {
      id,
      name: c.name,
      href: `/category/${c.slug}`,
      image: c.image || undefined,
      icon: c.icon || undefined,
    });
  }

  // Second pass: link children to parents.
  for (const c of visible) {
    const id = c.id || c._id || c.slug;
    const node = nodes.get(id)!;
    const pid = parentId(c);
    const parentNode = pid ? nodes.get(pid) : null;
    if (parentNode) {
      (parentNode.children ||= []).push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
