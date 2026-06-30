import { getProfile } from "@/features/profile/action";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarding_completed) redirect("/home");

  return <>{children}</>;
}
