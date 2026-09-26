import { AuthForm } from "../auth-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { invite } = await searchParams;
  return <AuthForm mode="signup" invite={typeof invite === "string" ? invite : undefined} />;
}
