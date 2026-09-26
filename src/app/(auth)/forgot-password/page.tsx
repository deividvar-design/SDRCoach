import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground text-sm">Enter your work email and we'll send a link.</p>
      </div>
      <ForgotForm />
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-foreground underline underline-offset-4">Back to sign in</Link>
      </p>
    </div>
  );
}
