import { createClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers"; // To get current URL for redirect

/**
 * Server-side function to verify admin privileges for a page/route.
 * Redirects non-admins or unauthenticated users.
 * Should be called at the beginning of Server Components or Route Handlers.
 */
export async function adminPageAuth() {
  const supabase = createClient();
  const pathname = headers().get("x-pathname") || "/"; // Get current path for redirect context

  // 1. Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn("[Admin Auth] User not authenticated. Redirecting to /.", { pathname });
    redirect("/"); // Redirect to home/login page
  }

  // 2. Check if user has admin role in profiles table
  // Check if user is in the admins table
  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (adminError) {
    console.error("[Admin Auth] Error fetching admin row:", adminError.message, { userId: user.id, pathname });
    // Decide how to handle profile fetch errors - redirect or throw? Redirecting for safety.
    redirect("/");
  }

  if (!adminRow) {
    console.warn("[Admin Auth] User is not an admin. Redirecting to /.", { userId: user.id, pathname });
    redirect("/"); // Redirect non-admins
  }

  // 3. User is authenticated and is an admin
  console.log("[Admin Auth] Access granted.", { userId: user.id, pathname });
  // Optionally return user or profile data if needed by the calling page/route
  // return { user, profile };
}