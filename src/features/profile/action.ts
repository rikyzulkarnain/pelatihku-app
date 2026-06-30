"use server";

import { createClient } from "@/lib/supabase/server";
import { FitnessProfile, Profile } from "@/types/profile";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return data;
}

export async function getFitnessProfile(): Promise<FitnessProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("fitness_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<FitnessProfile>();

  return data;
}

export async function setCoachPersona(
  persona: "tegas" | "suportif" | "santai",
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ coach_persona: persona })
    .eq("id", user.id);
}
