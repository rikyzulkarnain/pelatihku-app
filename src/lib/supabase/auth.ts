import { cache } from "react";
import { createClient } from "./server";

/**
 * Returns the authenticated Supabase user for the current request.
 *
 * `supabase.auth.getUser()` performs a network round-trip to the Supabase auth
 * server to validate the token. Many server actions need the user within a
 * single render pass (e.g. the home page fans out to getProfile,
 * getFitnessProfile and getActiveProgram, each of which previously re-validated
 * the token). Wrapping it in React `cache()` deduplicates all of those calls
 * into a single round-trip per request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
