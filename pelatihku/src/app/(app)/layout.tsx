import { getProfile } from "@/features/profile/action";
import AuthStoreProvider from "@/providers/auth-store-provider";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarding_completed) redirect("/onboarding");

  return <AuthStoreProvider profile={profile}>{children}</AuthStoreProvider>;
}
