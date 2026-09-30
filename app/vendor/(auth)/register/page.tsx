import {
  BookOpen,
  Building2,
  CircleDollarSign,
  CircleHelp,
  FileText,
  Mail,
  Megaphone,
  Package,
  Play,
  Plus,
  Smartphone,
  Store,
  Users,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { VendorRegisterForm } from "@/components/auth/VendorRegisterForm";
import { StorefrontFooter } from "@/components/shell/StorefrontFooter";
import { StorefrontHeader } from "@/components/shell/StorefrontHeader";

export const metadata: Metadata = { title: "Vendor Registration" };

const BENEFITS: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Easy Onboarding", text: "Start selling quickly with a guided setup that gets your store live in minutes.", icon: Users },
  { title: "24/7 Support", text: "Round-the-clock help from Sundry AI Support and our seller success team.", icon: CircleHelp },
  { title: "SEO Friendly", text: "Search-optimised listings that put your products in front of more buyers.", icon: ZoomIn },
  { title: "Free Marketing", text: "Featured placements, campaigns and newsletters to grow your visibility.", icon: Megaphone },
];

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Get Registered", text: "Sign up and create your seller account in just a few minutes.", icon: FileText },
  { title: "Upload Products", text: "List products with detailed descriptions and high-quality images.", icon: Package },
  { title: "Start Selling", text: "Go live, reach millions of buyers and get paid securely via Stripe.", icon: CircleDollarSign },
];

const FAQS = [
  ["How do I register as a seller?", "Fill in the two-step form above with your account and store details. Once submitted, our team reviews your store within 1–2 business days."],
  ["What are the fees for selling?", "There are no listing fees. Sundry takes a 10% commission on each completed sale, plus standard Stripe processing fees."],
  ["How do I upload products?", "After approval, open your Vendor Dashboard and go to Products → Add New Product. Add images, pricing, stock and variations, then publish."],
  ["How do I handle customer inquiries?", "Buyer questions arrive in your Inbox. Sundry AI Support answers common questions instantly and hands off to you when needed."],
  ["When do I get paid?", "Earnings from delivered orders are released to your Stripe account weekly. You can track every payout in the Transaction Report."],
  ["Can I sell internationally?", "Yes. Set shipping zones and rates per region in your store settings, and Sundry handles currency display for buyers."],
] as const;

const HELP: { title: string; sub: string; icon: LucideIcon; href: string }[] = [
  { title: "About Us", sub: "Know about our company more", icon: Building2, href: "#" },
  { title: "Contact Us", sub: "We are here to help", icon: Mail, href: "/account/support" },
  { title: "FAQ", sub: "Get all answers", icon: CircleHelp, href: "#faq" },
  { title: "Blog", sub: "Check latest blogs", icon: BookOpen, href: "#" },
];

const container = "mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)]";
const sectionTitle = "font-display text-[clamp(1.55rem,3vw,2rem)] font-extrabold tracking-[-0.02em]";
const eyebrow = "text-caption font-bold uppercase tracking-[0.08em] text-primary";

function ImageTile({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <div className={`relative grid w-full place-items-center overflow-hidden ${className}`}>
      <span className="grid size-20 place-items-center rounded-full bg-iris-50">
        <Icon aria-hidden className="size-9 text-iris-400" strokeWidth={1.6} />
      </span>
    </div>
  );
}

export default function VendorRegisterPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="bg-page">
        {/* Registration */}
        <section className={`${container} pt-8`}>
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-caption text-fg-muted">
            <Link href="/" className="!text-fg-muted hover:!text-primary">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="font-semibold text-fg-strong">
              Vendor Registration
            </span>
          </nav>
          <div className="flex flex-wrap items-stretch gap-[clamp(20px,3vw,36px)] rounded-2xl bg-linear-135 from-iris-50 to-card p-[clamp(16px,3vw,32px)]">
            <div className="flex min-w-0 flex-[1_1_300px] flex-col justify-center gap-4">
              <div>
                <span className={eyebrow}>Sell on Sundry</span>
                <h1 className="mt-2 mb-2 font-display text-[clamp(1.65rem,3.4vw,2.35rem)] leading-[1.1] font-extrabold tracking-[-0.02em] text-fg-strong">
                  Vendor Registration
                </h1>
                <p className="text-sm text-fg-muted">
                  Create your own store. Already have a store?{" "}
                  <Link href="/vendor/login" className="font-bold">
                    Log in
                  </Link>
                </p>
              </div>
              <ImageTile icon={Store} className="aspect-[4/3] max-w-[420px] rounded-xl bg-card shadow-sm" />
            </div>
            <VendorRegisterForm />
          </div>
        </section>

        {/* Why sell */}
        <section className={`${container} pt-[clamp(56px,7vw,88px)] text-center`}>
          <span className={eyebrow}>Why Sundry</span>
          <h2 className={`${sectionTitle} my-2 text-fg-strong`}>Why Sell With Us</h2>
          <p className="mx-auto max-w-[520px] text-sm text-fg-muted">
            Boost your sales. Join thousands of independent sellers on one confident, premium storefront.
          </p>
          <ImageTile icon={Megaphone} className="mx-auto mt-8 aspect-[16/7] max-w-[760px] rounded-xl bg-iris-50" />
          <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-4 text-left">
            {BENEFITS.map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className="rounded-lg bg-card p-6 shadow-sm transition-[box-shadow,transform] duration-(--dur-med) ease-out hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="grid size-11 place-items-center rounded-md bg-iris-50 text-primary">
                  <Icon aria-hidden className="size-[22px]" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 mb-1.5 text-base font-bold text-fg-strong">{title}</h3>
                <p className="text-sm leading-normal text-fg-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 steps */}
        <section className="mt-[clamp(56px,7vw,88px)] bg-linear-120 from-iris-800 to-iris-900 text-on-primary">
          <div className={`${container} py-[clamp(48px,6vw,72px)] text-center`}>
            <h2 className={`${sectionTitle} mb-2.5`}>3 Easy Steps To Start Selling</h2>
            <p className="mx-auto max-w-[560px] text-sm text-iris-100">
              Register, upload your products with detailed info and images, and reach millions of buyers.
            </p>
            <ol className="mt-11 grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-[clamp(24px,4vw,48px)]">
              {STEPS.map(({ title, text, icon: Icon }, i) => (
                <li key={title} className="flex flex-col items-center gap-3">
                  <span className="relative grid size-18 place-items-center rounded-lg bg-card text-primary shadow-lg">
                    <Icon aria-hidden className="size-8" strokeWidth={1.7} />
                    <span className="absolute -top-2 -right-2 grid size-6.5 place-items-center rounded-full bg-accent text-caption font-extrabold text-fg-strong">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-1.5 font-display text-h4 font-bold">{title}</h3>
                  <p className="max-w-[300px] text-sm leading-normal text-iris-100">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* App */}
        <section className={`${container} pt-[clamp(56px,7vw,88px)]`}>
          <div className="flex flex-wrap items-center gap-[clamp(20px,4vw,48px)] rounded-2xl bg-iris-50 p-[clamp(24px,4vw,48px)]">
            <ImageTile
              icon={Smartphone}
              className="mx-auto aspect-square max-w-[380px] min-w-0 flex-[1_1_260px] rounded-xl bg-card shadow-sm"
            />
            <div className="min-w-0 flex-[1.4_1_320px]">
              <span className={eyebrow}>Sundry Seller app</span>
              <h2 className={`${sectionTitle} mt-2 mb-2.5 text-fg-strong`}>Download Free Vendor App</h2>
              <p className="mb-6 max-w-[480px] text-sm leading-relaxed text-fg-muted">
                Manage listings, answer buyers and track payouts on the go. Easy setup, real-time order alerts, and
                your sales in your pocket.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Play, small: "GET IT ON", big: "Google Play" },
                  { icon: Smartphone, small: "Download on the", big: "App Store" },
                ].map(({ icon: Icon, small, big }) => (
                  <a
                    key={big}
                    href="#"
                    className="inline-flex h-12.5 items-center gap-2.5 rounded-md bg-inverse px-4.5 !text-on-primary"
                  >
                    <Icon aria-hidden className="size-[22px]" fill="currentColor" strokeWidth={1.5} />
                    <span className="flex flex-col text-left leading-tight">
                      <span className="text-[0.6rem] text-fg-subtle">{small}</span>
                      <span className="text-sm font-bold">{big}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${container} scroll-mt-6 pt-[clamp(56px,7vw,88px)]`}>
          <div className="mb-7 text-center">
            <h2 className={`${sectionTitle} mb-2 text-fg-strong`}>Frequently Asked Questions</h2>
            <p className="mx-auto max-w-[520px] text-sm text-fg-muted">
              Got questions about becoming a vendor? Here are answers to what new sellers ask most.
            </p>
          </div>
          <div className="mx-auto flex max-w-[880px] flex-col gap-2.5">
            {FAQS.map(([q, a]) => (
              <details key={q} name="vendor-faq" className="group overflow-hidden rounded-lg bg-card shadow-xs">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3.5 px-5 py-4.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  <span className="flex-1 text-sm font-semibold text-fg-strong">{q}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-fg transition-[transform,background-color] duration-(--dur-fast) ease-out group-open:rotate-45 group-open:bg-primary group-open:text-on-primary">
                    <Plus aria-hidden className="size-4" strokeWidth={2.2} />
                  </span>
                </summary>
                <p className="px-5 pb-4.5 text-sm leading-relaxed text-fg-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Help */}
        <section className={`${container} pt-14`}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
            {HELP.map(({ title, sub, icon: Icon, href }) => (
              <Link
                key={title}
                href={href}
                className="flex flex-col items-center gap-2.5 rounded-lg bg-card px-4 py-6 text-center shadow-sm transition-[box-shadow,transform] duration-(--dur-med) hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="grid size-12 place-items-center rounded-md bg-iris-50 text-primary">
                  <Icon aria-hidden className="size-[22px]" strokeWidth={1.8} />
                </span>
                <span className="text-sm font-bold text-fg-strong">{title}</span>
                <span className="text-caption text-fg-muted">{sub}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}
