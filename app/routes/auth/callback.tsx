import React from "react";
import { supabase } from "supabase/supabase-client";
import { useNavigate } from "react-router";

// TODO: Work on the ui of the auth callback page

export default function AuthCallback() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const hash = window.location.hash;

    async function handleOAuth() {
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        navigate("/login"); // or your auth page
        return;
      }
      // Save Supabase session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error("Error saving session:", sessionError.message);
        return;
      }

      // ✅ Get user info
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // ✅ Check if student exists
      const { data: student, error: studentError } = await supabase
        .from("student")
        .select("id, is_onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (studentError) {
        console.error("Student lookup error:", studentError.message);
        return;
      }

      // ✅ If no student exists, create one
      if (!student) {
        const { error: insertError } = await supabase.from("student").insert([
          {
            id: user.id,
            first_name: user.user_metadata?.full_name?.split(" ")[0] ?? "",
            last_name: user.user_metadata?.full_name?.split(" ")[1] ?? "",
            email: user.email,
          },
        ]);

        if (insertError) {
          console.error("Student creation error:", insertError.message);
          return;
        }

        // New students always go to onboarding
        window.location.replace("/onboarding");
        return;
      }

      // ✅ Redirect based on is_onboarded flag
      if (student.is_onboarded) {
        navigate("/student-dashboard");
      } else {
        navigate("/onboarding");
      }
    }

    handleOAuth();
  }, []);

  return <p className="text-center font-semibold text-4xl">Loading...</p>;
}
