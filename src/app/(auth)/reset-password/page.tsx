import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">At least 8 characters.</p>
      </div>
      <ResetForm />
    </div>
  );
}
