"use client";

import { useAuthStore } from "@/stores/auth-store";
import { Profile } from "@/types/profile";
import { ReactNode, useEffect } from "react";

export default function AuthStoreProvider({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile;
}) {
  // The profile is already validated server-side in the (app) layout, so hydrate
  // the store directly instead of firing another auth round-trip on every mount.
  useEffect(() => {
    useAuthStore.getState().setProfile(profile);
  }, [profile]);

  return <>{children}</>;
}
