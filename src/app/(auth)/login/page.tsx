import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, notice, error } = await searchParams;
  const message =
    notice === "deleted" ? { kind: "info" as const, text: "Your workspace was deleted. You can start a new one any time." }
    : error === "auth" ? { kind: "error" as const, text: "That sign-in link is invalid or has expired. Sign in again or request a new one." }
    : error === "google" ? { kind: "error" as const, text: "Google sign-in is not available right now. Use your email instead." }
    : undefined;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} notice={message} />;
}
