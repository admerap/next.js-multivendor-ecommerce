"use client";

import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Dumbbell,
  Shirt,
  ShoppingBag,
  Smartphone,
  Smile,
  Sofa,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Category = {
  name: string;
  slug: string;
  icon: LucideIcon;
  /** DESIGN_SYSTEM §8 category tint token. */
  tint: string;
  groups: { title: string; items: string[] }[];
};

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Category tree from the storefront designs (menuDefs). */
export const CATEGORY_MENU: Category[] = [
  {
    name: "Women's Fashion",
    slug: "women",
    icon: ShoppingBag,
    tint: "bg-(--tint-women)",
    groups: [
      { title: "Clothing", items: ["Dresses", "Tops & Blouses", "Knitwear", "Jeans", "Skirts", "Activewear"] },
      { title: "Footwear", items: ["Heels", "Flats", "Sneakers", "Boots", "Sandals"] },
      { title: "Bags", items: ["Totes", "Crossbody", "Clutches", "Backpacks"] },
      { title: "Jewelry", items: ["Necklaces", "Earrings", "Rings", "Bracelets"] },
    ],
  },
  {
    name: "Men's Fashion",
    slug: "men",
    icon: Shirt,
    tint: "bg-(--tint-men)",
    groups: [
      { title: "Clothing", items: ["Shirts", "T-Shirts", "Hoodies", "Jeans", "Pants", "Sweaters"] },
      { title: "Footwear", items: ["Sneakers", "Loafers", "Boots", "Sandals"] },
      { title: "Accessories", items: ["Belts", "Wallets", "Sunglasses", "Watches"] },
      { title: "Bags", items: ["Backpacks", "Business Bags", "Duffels"] },
    ],
  },
  {
    name: "Phones & Gadgets",
    slug: "phones",
    icon: Smartphone,
    tint: "bg-(--tint-tech)",
    groups: [
      { title: "Smartphones", items: ["iPhone", "Samsung Galaxy", "Google Pixel", "OnePlus"] },
      { title: "Wearables", items: ["Smart Watches", "Fitness Bands", "VR Headsets"] },
      { title: "Accessories", items: ["Cases", "Chargers", "Power Banks", "Screen Protectors"] },
      { title: "Audio", items: ["Earbuds", "Headphones", "Speakers"] },
    ],
  },
  {
    name: "Electronics",
    slug: "electronics",
    icon: Cpu,
    tint: "bg-(--tint-tech)",
    groups: [
      { title: "Computers", items: ["Laptops", "Desktops", "Monitors", "Keyboards"] },
      { title: "TV & Video", items: ["Smart TVs", "Streaming", "Projectors", "Soundbars"] },
      { title: "Cameras", items: ["DSLR", "Mirrorless", "Action Cameras", "Drones"] },
      { title: "Gaming", items: ["Consoles", "Controllers", "Games", "Headsets"] },
    ],
  },
  {
    name: "Health & Beauty",
    slug: "beauty",
    icon: Sparkles,
    tint: "bg-(--tint-beauty)",
    groups: [
      { title: "Skincare", items: ["Moisturizers", "Cleansers", "Serums", "Sunscreen"] },
      { title: "Makeup", items: ["Lipstick", "Foundation", "Mascara", "Eyeshadow"] },
      { title: "Hair Care", items: ["Shampoo", "Conditioner", "Styling", "Treatments"] },
      { title: "Fragrance", items: ["Perfume", "Body Mist", "Cologne"] },
    ],
  },
  {
    name: "Home & Kitchen",
    slug: "home",
    icon: Sofa,
    tint: "bg-(--tint-home)",
    groups: [
      { title: "Furniture", items: ["Sofas", "Beds", "Tables", "Chairs"] },
      { title: "Kitchen", items: ["Cookware", "Bakeware", "Dinnerware", "Appliances"] },
      { title: "Décor", items: ["Lighting", "Rugs", "Wall Art", "Mirrors"] },
      { title: "Bed & Bath", items: ["Bed Sheets", "Towels", "Curtains"] },
    ],
  },
  {
    name: "Kid's Fashion",
    slug: "kids",
    icon: Smile,
    tint: "bg-(--tint-kids)",
    groups: [
      { title: "Boys", items: ["T-Shirts", "Shorts", "Jeans", "Shoes"] },
      { title: "Girls", items: ["Dresses", "Tops", "Skirts", "Shoes"] },
      { title: "Baby", items: ["Bodysuits", "Rompers", "Sleepwear"] },
      { title: "Accessories", items: ["Hats", "Socks", "Backpacks"] },
    ],
  },
  {
    name: "Sports & Outdoor",
    slug: "sports",
    icon: Dumbbell,
    tint: "bg-(--tint-sports)",
    groups: [
      { title: "Fitness", items: ["Dumbbells", "Yoga Mats", "Resistance Bands", "Treadmills"] },
      { title: "Outdoor", items: ["Camping", "Hiking", "Cycling", "Fishing"] },
      { title: "Team Sports", items: ["Football", "Basketball", "Tennis", "Cricket"] },
      { title: "Activewear", items: ["Running Shoes", "Tops", "Leggings", "Jackets"] },
    ],
  },
];

const subHref = (c: Category, item: string) => `/category/${c.slug}?sub=${slug(item)}`;

/**
 * Two-pane mega-menu (DESIGN_SYSTEM §5 CategoryMegaMenu): category list on the left, the hovered
 * category's sub-groups in two columns on the right. Desktop only (≥1025px).
 */
export function CategoryMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [active, setActive] = useState(0);
  const cat = CATEGORY_MENU[active]!;

  return (
    <div className="flex min-h-105 overflow-hidden rounded-lg border border-line bg-card shadow-xl">
      <ul className="w-70 shrink-0 border-r border-line p-2">
        {CATEGORY_MENU.map((c, i) => {
          const on = i === active;
          const Icon = c.icon;
          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={onNavigate}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3.5 text-sm transition-colors duration-(--dur-fast)",
                  on ? "bg-iris-50 font-bold !text-primary" : "font-medium !text-fg hover:bg-iris-50 hover:!text-primary",
                )}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm text-fg-strong", c.tint)}>
                  <Icon aria-hidden className="size-4.5" strokeWidth={1.7} />
                </span>
                <span className="flex-1">{c.name}</span>
                <ChevronRight aria-hidden className={cn("size-4", on ? "text-primary" : "text-fg-subtle")} strokeWidth={2} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div
        aria-label={`${cat.name} subcategories`}
        className="grid w-[420px] grid-cols-2 content-start gap-x-6 gap-y-5.5 px-6 py-6 min-[1101px]:w-140 min-[1101px]:gap-x-10 min-[1101px]:gap-y-7 min-[1101px]:px-8 min-[1101px]:py-7"
      >
        {cat.groups.map((g) => (
          <div key={g.title}>
            <h4 className="mb-3.5 font-display text-base font-extrabold tracking-[-0.01em] text-fg-strong">{g.title}</h4>
            <ul className="flex flex-col gap-2.5">
              {g.items.map((item) => (
                <li key={item}>
                  <Link href={subHref(cat, item)} onClick={onNavigate} className="text-sm !text-fg transition-colors duration-(--dur-fast) hover:!text-primary">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ≤1024px: floating accordion panel under the category bar; each category expands to its sub-groups. */
export function MobileCategoryPanel({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-card p-2 shadow-xl">
      {CATEGORY_MENU.map((c, i) => {
        const on = open === i;
        const Icon = c.icon;
        return (
          <div key={c.slug}>
            <button
              type="button"
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className={cn(
                "flex min-h-12 w-full items-center gap-3.5 rounded-md px-3.5 text-[0.9rem] font-semibold",
                on ? "bg-iris-50 text-primary" : "text-fg",
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.8} />
              <span className="flex-1 text-left">{c.name}</span>
              <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-(--dur-fast)", on && "rotate-180")} strokeWidth={2} />
            </button>
            {on && (
              <div className="mt-0.5 mr-2 mb-2 ml-12 flex flex-col gap-3 border-l-2 border-iris-100 py-1.5 pl-3">
                <Link href={`/category/${c.slug}`} onClick={onNavigate} className="text-caption font-bold">
                  Shop all {c.name}
                </Link>
                {c.groups.map((g) => (
                  <div key={g.title}>
                    <div className="mb-1.5 text-caption font-bold text-fg-strong">{g.title}</div>
                    <div className="flex flex-col">
                      {g.items.map((item) => (
                        <Link key={item} href={subHref(c, item)} onClick={onNavigate} className="py-1.5 text-sm !text-fg-muted hover:!text-primary">
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
