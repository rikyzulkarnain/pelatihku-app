import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";

export type AdminStats = {
  totalUsers: number;
  newUsers7d: number;
  activeToday: number;
  sessionsTotal: number;
  sessionsToday: number;
  mealsToday: number;
};

export type AdminActivity = {
  type: "session" | "meal" | "signup";
  userName: string;
  title: string;
  detail: string;
  at: string; // ISO
};

export type FeedbackStatus = "baru" | "diproses" | "selesai";

export type AdminFeedbackRow = {
  id: string;
  type: "saran" | "bug" | "lainnya";
  message: string;
  page: string | null;
  status: FeedbackStatus;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  onboarded: boolean;
  goal: string | null;
  level: string | null;
  totalSessions: number;
  lastWorkoutAt: string | null;
  mealsLogged: number;
};

type BaseData = {
  users: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  }[];
  nameById: Map<string, string>;
  profiles: { id: string; name: string | null; onboarding_completed: boolean }[];
  fitness: { user_id: string; goal: string | null; experience_level: string | null }[];
  sessions: {
    user_id: string;
    completed_at: string | null;
    total_volume: number | null;
    day_label: string;
  }[];
  meals: { user_id: string; food_name: string; calories: number; created_at: string }[];
  sessionsTotal: number;
  mealsTotal: number;
};

async function fetchBase(): Promise<BaseData> {
  const admin = createAdminClient();

  const [usersRes, profilesRes, fitnessRes, sessionsRes, mealsRes, sessCount, mealCount] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id, name, onboarding_completed"),
      admin.from("fitness_profiles").select("user_id, goal, experience_level"),
      admin
        .from("workout_sessions")
        .select("user_id, completed_at, total_volume, program_day:program_days(label)")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1000),
      admin
        .from("nutrition_logs")
        .select("user_id, food_name, calories, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      admin
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      admin.from("nutrition_logs").select("id", { count: "exact", head: true }),
    ]);

  const users = (usersRes.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "-",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
  }));
  const profiles = (profilesRes.data ?? []) as BaseData["profiles"];
  const nameById = new Map(profiles.map((p) => [p.id, p.name ?? ""]));

  return {
    users,
    profiles,
    nameById,
    fitness: (fitnessRes.data ?? []) as BaseData["fitness"],
    sessions: (sessionsRes.data ?? []).map((s) => ({
      user_id: s.user_id as string,
      completed_at: (s.completed_at as string | null) ?? null,
      total_volume: Number(s.total_volume ?? 0),
      day_label:
        (s.program_day as unknown as { label?: string } | null)?.label ?? "Sesi latihan",
    })),
    meals: (mealsRes.data ?? []) as BaseData["meals"],
    sessionsTotal: sessCount.count ?? 0,
    mealsTotal: mealCount.count ?? 0,
  };
}

function displayName(base: BaseData, userId: string, email?: string): string {
  const name = base.nameById.get(userId);
  if (name) return name;
  const mail = email ?? base.users.find((u) => u.id === userId)?.email;
  return mail?.split("@")[0] ?? "Pengguna";
}

export async function getAdminDashboard(): Promise<{
  stats: AdminStats;
  activity: AdminActivity[];
}> {
  const base = await fetchBase();
  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const isToday = (iso: string | null) =>
    !!iso && format(new Date(iso), "yyyy-MM-dd") === today;

  const activeIds = new Set<string>();
  let sessionsToday = 0;
  for (const s of base.sessions) {
    if (isToday(s.completed_at)) {
      sessionsToday += 1;
      activeIds.add(s.user_id);
    }
  }
  let mealsToday = 0;
  for (const m of base.meals) {
    if (isToday(m.created_at)) {
      mealsToday += 1;
      activeIds.add(m.user_id);
    }
  }

  const stats: AdminStats = {
    totalUsers: base.users.length,
    newUsers7d: base.users.filter((u) => new Date(u.created_at).getTime() >= sevenDaysAgo)
      .length,
    activeToday: activeIds.size,
    sessionsTotal: base.sessionsTotal,
    sessionsToday,
    mealsToday,
  };

  // Feed aktivitas: gabungan sesi selesai, catatan makan, dan pendaftaran baru.
  const activity: AdminActivity[] = [
    ...base.sessions
      .filter((s) => s.completed_at)
      .slice(0, 30)
      .map((s) => ({
        type: "session" as const,
        userName: displayName(base, s.user_id),
        title: `Menyelesaikan ${s.day_label}`,
        detail: `${Math.round(s.total_volume ?? 0).toLocaleString("id-ID")} kg terangkat`,
        at: s.completed_at!,
      })),
    ...base.meals.slice(0, 30).map((m) => ({
      type: "meal" as const,
      userName: displayName(base, m.user_id),
      title: `Mencatat ${m.food_name}`,
      detail: `${Math.round(Number(m.calories) || 0)} kkal`,
      at: m.created_at,
    })),
    ...base.users.slice(0, 30).map((u) => ({
      type: "signup" as const,
      userName: displayName(base, u.id, u.email),
      title: "Mendaftar akun baru",
      detail: u.email,
      at: u.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30);

  return { stats, activity };
}

export async function getAdminFeedback(): Promise<AdminFeedbackRow[]> {
  const admin = createAdminClient();

  const [fbRes, usersRes, profilesRes] = await Promise.all([
    admin
      .from("feedback")
      .select("id, user_id, type, message, page, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, name"),
  ]);

  const emailById = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? "-"]),
  );
  const nameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, (p.name as string | null) ?? ""]),
  );

  return (fbRes.data ?? []).map((f) => {
    const email = emailById.get(f.user_id as string) ?? "-";
    const name = nameById.get(f.user_id as string) || email.split("@")[0] || "Pengguna";
    return {
      id: f.id as string,
      type: f.type as AdminFeedbackRow["type"],
      message: f.message as string,
      page: (f.page as string | null) ?? null,
      status: f.status as FeedbackStatus,
      createdAt: f.created_at as string,
      userName: name,
      userEmail: email,
    };
  });
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const base = await fetchBase();

  const sessionAgg = new Map<string, { count: number; last: string | null }>();
  for (const s of base.sessions) {
    const agg = sessionAgg.get(s.user_id) ?? { count: 0, last: null };
    agg.count += 1;
    if (!agg.last && s.completed_at) agg.last = s.completed_at; // sudah terurut desc
    sessionAgg.set(s.user_id, agg);
  }
  const mealAgg = new Map<string, number>();
  for (const m of base.meals) {
    mealAgg.set(m.user_id, (mealAgg.get(m.user_id) ?? 0) + 1);
  }
  const profileById = new Map(base.profiles.map((p) => [p.id, p]));
  const fitnessById = new Map(base.fitness.map((f) => [f.user_id, f]));

  return base.users
    .map((u) => {
      const sess = sessionAgg.get(u.id);
      return {
        id: u.id,
        name: displayName(base, u.id, u.email),
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        onboarded: profileById.get(u.id)?.onboarding_completed ?? false,
        goal: fitnessById.get(u.id)?.goal ?? null,
        level: fitnessById.get(u.id)?.experience_level ?? null,
        totalSessions: sess?.count ?? 0,
        lastWorkoutAt: sess?.last ?? null,
        mealsLogged: mealAgg.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
