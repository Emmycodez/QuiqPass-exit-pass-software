import React from "react";
import { supabase } from "supabase/supabase-client";
import { redirect, useNavigate } from "react-router";
import Loader from "~/components/loader";

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
        window.location.replace("/login");
        return;
      }

      // Save Supabase session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error("Error saving session:", sessionError.message);
        window.location.replace("/login");
        return;
      }

      // ✅ Get authenticated user info
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (userError || !user) {
        console.error("Error getting user:", userError?.message);
        window.location.replace("/login");
        return;
      }

      try {
        // ✅ Check if user exists in unified users table
        const { data: existingUser, error: userLookupError } = await supabase
          .from("users")
          .select("id, user_type")
          .eq("id", user.id)
          .maybeSingle();

        if (userLookupError) {

          console.error("User lookup error:", userLookupError.message);
          return redirect("/login");
        }

        // ✅ If user doesn't exist in users table, create entries
        if (!existingUser) {
          // Create entry in users table (unified base table)
          const { error: usersInsertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email!,
              user_type: "student", // Default to student for OAuth signups
            });

          if (usersInsertError) {
            console.error("Users table insert error:", usersInsertError.message);
            return;
          }

          // Create entry in student table
          const { error: studentInsertError } = await supabase
            .from("student")
            .insert({
              id: user.id,
              first_name: user.user_metadata?.full_name?.split(" ")[0] ?? "",
              last_name: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ?? "",
              email: user.email!,
              is_onboarded: false,
            });

          if (studentInsertError) {
            console.error("Student creation error:", studentInsertError.message);
            return redirect("/login");
          }

          // Log the registration
          await supabase.from("audit_log").insert({
            user_id: user.id,
            action: "user_registered",
            entity_type: "student",
            entity_id: user.id,
          });

          // New students always go to onboarding
          window.location.replace("/onboarding");
          return;
        }

        // ✅ User exists - check their type and redirect accordingly
        if (existingUser.user_type === "student") {
          // Check student onboarding status
          const { data: student, error: studentError } = await supabase
            .from("student")
            .select("id, is_onboarded")
            .eq("id", user.id)
            .single();

          if (studentError) {
            console.error("Student lookup error:", studentError.message);
            return redirect("login");
          }

          // Log login
          await supabase.from("audit_log").insert({
            user_id: user.id,
            action: "user_logged_in",
            entity_type: "student",
            entity_id: user.id,
          });

          // Redirect based on onboarding status
          if (student.is_onboarded) {
            navigate("/student-dashboard");
          } else {
            navigate("/onboarding");
          }
        } else if (existingUser.user_type === "staff") {
          // Get staff info to determine role
          const { data: staff, error: staffError } = await supabase
            .from("staff")
            .select("id, role")
            .eq("id", user.id)
            .single();

          if (staffError) {
            console.error("Staff lookup error:", staffError.message);
            return redirect("/login");
          }

          // Log login
          await supabase.from("audit_log").insert({
            user_id: user.id,
            action: "user_logged_in",
            entity_type: "staff",
            entity_id: user.id,
          });

          // Redirect based on staff role
          switch (staff.role) {
            case "DSA":
              navigate("/dsa-dashboard");
              break;
            case "CSO":
            case "Assistant CSO":
              navigate("/cso-dashboard");
              break;
            case "porter":
              navigate("/porter-dashboard");
              break;
            case "Security":
              navigate("/security-dashboard");
              break;
            case "overseer":
              navigate("/overseer-dashboard");
              break;
            default:
              navigate("/staff-dashboard");
          }
        }
      } catch (error) {
        console.error("Unexpected error during auth:", error);
        window.location.replace("/login");
      }
    }

    handleOAuth();
  }, [navigate]);

  return <Loader />;
}