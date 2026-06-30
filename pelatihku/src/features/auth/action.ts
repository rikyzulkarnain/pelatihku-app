"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/validations/auth-validation";
import { revalidatePath } from "next/cache";

type ActionResult = { error?: string; next?: string };

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const {
    error,
    data: { user },
  } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user?.id)
    .single();

  revalidatePath("/", "layout");
  return { next: profile?.onboarding_completed ? "/home" : "/onboarding" };
}

export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  });

  if (error) return { error: error.message };

  // When email confirmation is disabled, a session is returned immediately.
  if (!data.session) {
    return {
      error:
        "Akun dibuat. Cek email untuk konfirmasi, lalu masuk untuk lanjut.",
    };
  }

  revalidatePath("/", "layout");
  return { next: "/onboarding" };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
