import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { CustomerRegisterForm } from "@/components/auth/CustomerRegisterForm";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <AuthSplit
      title="Create your account"
      subtitle="Join Sundry to shop thousands of independent sellers with one checkout."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold">
            Sign in
          </Link>
        </>
      }
    >
      <CustomerRegisterForm />
    </AuthSplit>
  );
}
