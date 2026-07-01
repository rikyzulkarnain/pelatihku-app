import { type NextRequest } from "next/server";
import { supabaseProxy } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await supabaseProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
