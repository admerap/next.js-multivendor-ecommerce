import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;

  return (
    <AuthSplit
      title="Welcome back"
      subtitle="Sign in to your Sundry account to continue."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
    </AuthSplit>
  );
}
