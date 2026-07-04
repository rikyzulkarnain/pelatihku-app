export const ENVIRONMENT = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  googleGenAIKey: process.env.GOOGLE_GEN_AI_API_KEY,
  /** Email yang boleh membuka /admin (pisahkan dengan koma di env ADMIN_EMAILS). */
  adminEmails: process.env.ADMIN_EMAILS ?? "rikyzulkarnain21@gmail.com",
};
