import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SundryLogo } from "@/components/auth/SundryLogo";

export const metadata: Metadata = { title: "Admin Sign In" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col bg-page">
      <div className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pt-8">
        <SundryLogo eyebrow="Admin Console" />
      </div>
      <AuthCard
        icon={ShieldCheck}
        eyebrow="Marketplace staff"
        title="Admin sign in"
        subtitle="Sign in to manage vendors, products, orders and reports."
      >
        <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
      </AuthCard>
    </main>
  );
}
