export const ENVIRONMENT = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleGenAIKey: process.env.GOOGLE_GEN_AI_API_KEY,
  /** Email yang boleh membuka /admin (pisahkan dengan koma di env ADMIN_EMAILS). */
  adminEmails: process.env.ADMIN_EMAILS ?? "rikyzulkarnain21@gmail.com",

  /**
   * Integrasi webhook Instagram (dikonsumsi bot eksternal "Hermes").
   * Semua opsional — kalau belum diset, endpoint /api/instagram/* balas 503.
   */
  instagram: {
    /** String bebas; harus sama dengan "Verify token" di Meta Dashboard. */
    webhookVerifyToken: process.env.IG_WEBHOOK_VERIFY_TOKEN,
    /** Kunci Rahasia Aplikasi Meta — untuk verifikasi X-Hub-Signature-256. */
    appSecret: process.env.IG_APP_SECRET,
    /** Access token Instagram untuk mengirim balasan komentar. */
    accessToken: process.env.IG_ACCESS_TOKEN,
    /** graph.instagram.com (Instagram Login) atau graph.facebook.com (Facebook Login). */
    graphHost: process.env.IG_GRAPH_HOST ?? "graph.instagram.com",
    graphVersion: process.env.IG_GRAPH_VERSION ?? "v23.0",
    /** Batas balasan per jam; Instagram membatasi 200/jam per akun. */
    replyHourlyLimit: Number(process.env.IG_REPLY_HOURLY_LIMIT ?? 150),
  },
  hermes: {
    /** Bearer token yang dipakai bot Hermes untuk memanggil /api/instagram/*. */
    apiKey: process.env.HERMES_API_KEY,
    /** Opsional: kalau diset, event baru langsung di-push ke URL ini. */
    pushUrl: process.env.HERMES_PUSH_URL,
  },
};
