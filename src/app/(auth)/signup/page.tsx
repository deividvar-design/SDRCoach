import { AuthForm } from "../auth-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { invite, email } = await searchParams;
  return <AuthForm mode="signup" invite={typeof invite === "string" ? invite : undefined} email={typeof email === "string" ? email : undefined} />;
}
