import { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { Profile } from "@/types/profile";

const INITIAL_PROFILE: Profile = {
  id: "",
  name: "",
  avatar_url: "",
  coach_persona: "suportif",
  onboarding_completed: false,
};

type AuthState = {
  user: User | null;
  profile: Profile;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: INITIAL_PROFILE,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
}));
