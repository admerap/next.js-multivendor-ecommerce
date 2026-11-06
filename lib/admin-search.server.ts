import "server-only";

import type { Access } from "@/lib/access.server";
import { prisma } from "@/lib/db";
import { money } from "@/lib/money";
import { customerOrderStatus, ORDER_STATUS_LABEL } from "@/lib/orders";
import { MODULE_HOME, PERMISSION_MODULES, type PermissionModule } from "@/lib/permissions";

/** One hit: what it is, where it opens, and a short second line. */
export type SearchHit = { id: string; title: string; subtitle: string; href: string; image?: string | null; badge?: string };
export type SearchGroup = { key: string; label: string; module: PermissionModule; hits: SearchHit[]; viewAll?: string };

export const SEARCH_LIMIT = 5;
const take = SEARCH_LIMIT;
const date = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Admin pages by name ("tax" → Tax Rates), so the search box also works as a jump-to for the menu. */
const PAGES: { label: string; href: string; module: PermissionModule; words: string }[] = [
  ...PERMISSION_MODULES.map((m) => ({ label: m.label, href: MODULE_HOME[m.key], module: m.key, words: m.label })),
  { label: "Vendor Approval", href: "/admin/vendors/approval", module: "vendors", words: "vendor approval pending stores" },
  { label: "Pending Products", href: "/admin/products/pending", module: "products", words: "pending products approval" },
  { label: "Featured Products", href: "/admin/products/featured", module: "products", words: "featured products" },
  { label: "Sub-Categories", href: "/admin/categories/sub", module: "categories", words: "sub categories subcategories" },
  { label: "Earnings Report", href: "/admin/reports/earnings", module: "reports", words: "earnings report commission" },
  { label: "Product Stock Report", href: "/admin/reports/stock", module: "reports", words: "stock inventory report" },
  { label: "Pending Coupons", href: "/admin/coupons/pending", module: "coupons", words: "pending coupons approval" },
];

/**
 * Admin › Search (the header box): matches in every module the signed-in role may read — orders (by number,
 * customer name or email), products (name, SKU), stores, customers, brands, categories, coupons, staff users and
 * admin pages — at most SEARCH_LIMIT per group, each with a "View all" into its list when the list can filter.
 * Modules the role can't read are never queried.
 */
export async function searchAdmin(raw: string, access: Access): Promise<SearchGroup[]> {
  const q = raw.trim().slice(0, 100);
  if (q.length < 2) return [];
  const can = (m: PermissionModule) => access.permissions[m].read;
  const enc = encodeURIComponent(q);
  const number = Number(q.replace(/^#/, ""));

  const [orders, products, vendors, customers, brands, categories, coupons, users] = await Promise.all([
    can("orders")
      ? prisma.order.findMany({
          where: {
            OR: [
              ...(Number.isInteger(number) && number > 0 ? [{ orderNumber: number }] : []),
              { customer: { name: { contains: q } } },
              { customer: { email: { contains: q } } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
            customer: { select: { name: true } },
            storeOrders: { select: { status: true } },
          },
        })
      : [],
    can("products")
      ? prisma.product.findMany({
          where: { OR: [{ name: { contains: q } }, { sku: { contains: q } }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, name: true, sku: true, thumbnail: true, approvalStatus: true, vendor: { select: { storeName: true } } },
        })
      : [],
    can("vendors")
      ? prisma.vendor.findMany({
          where: { OR: [{ storeName: { contains: q } }, { user: { email: { contains: q } } }, { user: { name: { contains: q } } }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, storeName: true, logo: true, status: true, user: { select: { name: true, email: true } } },
        })
      : [],
    can("customers")
      ? prisma.user.findMany({
          where: { role: "CUSTOMER", OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, name: true, email: true, image: true, blockedAt: true },
        })
      : [],
    can("brands")
      ? prisma.brand.findMany({ where: { name: { contains: q } }, orderBy: { name: "asc" }, take, select: { id: true, name: true, image: true, status: true } })
      : [],
    can("categories")
      ? prisma.category.findMany({
          where: { name: { contains: q } },
          orderBy: { name: "asc" },
          take,
          select: { id: true, name: true, image: true, status: true },
        })
      : [],
    can("coupons")
      ? prisma.coupon.findMany({
          where: { OR: [{ code: { contains: q } }, { title: { contains: q } }] },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, code: true, title: true, approvalStatus: true, vendor: { select: { storeName: true } } },
        })
      : [],
    can("users")
      ? prisma.user.findMany({
          where: {
            role: "ADMIN",
            deletedAt: null,
            // Same rule as the Users list: only a Super Admin sees Super Admins.
            ...(!access.isSuper && { NOT: { adminRole: { is: { isSystem: true } } } }),
            OR: [{ name: { contains: q } }, { email: { contains: q } }],
          },
          orderBy: { createdAt: "asc" },
          take,
          select: { id: true, name: true, email: true, image: true, adminRole: { select: { name: true } } },
        })
      : [],
  ]);

  const words = q.toLowerCase();
  const seen = new Set<string>(); // a module's home can also be a named page (Coupons = Pending Coupons): list it once
  const pages = PAGES.filter((pg) => can(pg.module) && (pg.label.toLowerCase().includes(words) || pg.words.toLowerCase().includes(words)))
    .filter((pg) => !seen.has(pg.href) && !!seen.add(pg.href))
    .slice(0, take);
  const approval = (s: string) => (s === "REJECTED" ? "Denied" : s[0] + s.slice(1).toLowerCase());

  const groups: SearchGroup[] = [
    {
      key: "pages",
      label: "Pages",
      module: "dashboard",
      hits: pages.map((pg) => ({ id: pg.href, title: pg.label, subtitle: "Admin page", href: pg.href })),
    },
    {
      key: "orders",
      label: "Orders",
      module: "orders",
      viewAll: `/admin/orders?q=${enc}`,
      hits: orders.map((o) => ({
        id: o.id,
        title: `Order #${o.orderNumber}`,
        subtitle: `${o.customer.name} · ${money(o.total)} · ${date(o.createdAt)}`,
        href: `/admin/orders/${o.orderNumber}`,
        badge: o.storeOrders.length ? ORDER_STATUS_LABEL[customerOrderStatus(o.storeOrders.map((s) => s.status))] : undefined,
      })),
    },
    {
      key: "products",
      label: "Products",
      module: "products",
      hits: products.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.vendor.storeName} · SKU ${p.sku}`,
        href: `/admin/products/${p.id}`,
        image: p.thumbnail,
        badge: approval(p.approvalStatus),
      })),
    },
    {
      key: "vendors",
      label: "Stores",
      module: "vendors",
      viewAll: `/admin/vendors?q=${enc}`,
      hits: vendors.map((v) => ({
        id: v.id,
        title: v.storeName,
        subtitle: `${v.user.name} · ${v.user.email}`,
        href: `/admin/vendors/${v.id}`,
        image: v.logo,
        badge: v.status[0] + v.status.slice(1).toLowerCase(),
      })),
    },
    {
      key: "customers",
      label: "Customers",
      module: "customers",
      viewAll: `/admin/customers?q=${enc}`,
      hits: customers.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.email,
        href: `/admin/customers/${c.id}`,
        image: c.image,
        badge: c.blockedAt ? "Blocked" : undefined,
      })),
    },
    {
      key: "brands",
      label: "Brands",
      module: "brands",
      viewAll: `/admin/brands?q=${enc}`,
      hits: brands.map((b) => ({
        id: b.id,
        title: b.name,
        subtitle: "Brand",
        href: `/admin/brands/${b.id}`,
        image: b.image,
        badge: b.status === "INACTIVE" ? "Inactive" : undefined,
      })),
    },
    {
      key: "categories",
      label: "Categories",
      module: "categories",
      viewAll: `/admin/categories?q=${enc}`,
      hits: categories.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: "Category",
        href: `/admin/categories?q=${encodeURIComponent(c.name)}`,
        image: c.image,
        badge: c.status === "INACTIVE" ? "Inactive" : undefined,
      })),
    },
    {
      key: "coupons",
      label: "Coupons",
      module: "coupons",
      hits: coupons.map((c) => ({
        id: c.id,
        title: c.code,
        subtitle: `${c.title} · ${c.vendor.storeName}`,
        href: `/admin/coupons/${c.id}`,
        badge: approval(c.approvalStatus),
      })),
    },
    {
      key: "users",
      label: "Users",
      module: "users",
      viewAll: `/admin/users?q=${enc}`,
      hits: users.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: `${u.email} · ${u.adminRole?.name ?? "No role"}`,
        href: `/admin/users?q=${encodeURIComponent(u.email)}`,
        image: u.image,
      })),
    },
  ];
  return groups.filter((g) => g.hits.length > 0);
}
