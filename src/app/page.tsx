import { getProfile } from "@/features/profile/action";
import { redirect } from "next/navigation";
import WelcomeView from "./_components/welcome-view";

export default async function RootPage() {
  // Kalau sudah login, langsung ke halaman utama (atau onboarding bila belum selesai).
  const profile = await getProfile();
  if (profile) {
    redirect(profile.onboarding_completed ? "/home" : "/onboarding");
  }

  return <WelcomeView />;
}
