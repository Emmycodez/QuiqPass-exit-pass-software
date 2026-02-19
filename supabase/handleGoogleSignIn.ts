import { supabase } from "supabase/supabase-client"; // your client export

export async function handleGoogleSignIn() {
  const baseUrl = import.meta.env.VITE_BASE_URL || "http://localhost:5173"; // 👈 use import.meta.env

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("Google Sign-In error:", error.message);
  } else {
    console.log("Redirecting to Google…", data);
  }
}
