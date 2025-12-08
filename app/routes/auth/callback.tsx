// app/routes/auth/callback.tsx

import {
  redirect,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { supabase } from "supabase/supabase-client";
import Loader from "~/components/loader";

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  // // --- 2) Extract hash fragment tokens from request URL ---
  // const url = new URL(request.url);
  // const hash = url.hash;

  // if (!hash) return redirect("/login");

  // const params = new URLSearchParams(hash.substring(1));
  // const access_token = params.get("access_token");
  // const refresh_token = params.get("refresh_token");

  // if (!access_token || !refresh_token) return redirect("/login");

  // // --- 3) Save session server-side ---
  // const { error: sessionError } = await supabase.auth.setSession({
  //   access_token,
  //   refresh_token,
  // });

  // if (sessionError) return redirect("/login");

  // // --- 4) Fetch authenticated user info ---
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return redirect("/login");

  // --- 5) Look up the unified user record ---
  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) return redirect("/login");

  // --- 6) User not found => create student by default ---
  if (!existingUser) {
    await supabase.from("users").insert({
      id: user.id,
      email: user.email!,
      user_type: "student",
    });

    await supabase.from("student").insert({
      id: user.id,
      first_name: user.user_metadata?.full_name?.split(" ")[0] ?? "",
      last_name:
        user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? "",
      email: user.email!,
      is_onboarded: false,
    });

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "user_registered",
      entity_type: "student",
      entity_id: user.id,
    });

    return redirect("/onboarding");
  }

  // --- 7) Handle student login flow ---
  if (existingUser.user_type === "student") {
    const { data: student } = await supabase
      .from("student")
      .select("id, is_onboarded")
      .eq("id", user.id)
      .maybeSingle();

    if (!student) {
      await supabase.from("student").insert({
        id: user.id,
        first_name: user.user_metadata?.full_name?.split(" ")[0] ?? "",
        last_name:
          user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? "",
        email: user.email!,
        is_onboarded: false,
      });
      return redirect("/onboarding");
    }

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "user_logged_in",
      entity_type: "student",
      entity_id: user.id,
    });

    if (student.is_onboarded) return redirect("/student-dashboard");
    return redirect("/onboarding");
  }

  // --- 8) Handle staff login flow ---
  const { data: staff } = await supabase
    .from("staff")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff) return redirect("/login");

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "user_logged_in",
    entity_type: "staff",
    entity_id: user.id,
  });

  switch (staff.role) {
    case "DSA":
      return redirect("/dsa-dashboard");
    case "CSO":
    case "Assistant CSO":
      return redirect("/cso-dashboard");
    case "porter":
      return redirect("/porter-dashboard");
    case "Security":
      return redirect("/security-dashboard");
    case "overseer":
      return redirect("/overseer-dashboard");
    default:
      return redirect("/staff-dashboard");
  }
}

export function HydrateFallback() {
  return <Loader />;
}

export default function AuthCallback() {
  return <div>..................</div>;
}
