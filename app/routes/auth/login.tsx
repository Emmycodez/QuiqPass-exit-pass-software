import { data, redirect } from "react-router";
import Logo from "~/components/global/logo";
import type { Route } from "./+types/register";
import LoginForm from "./_components/login-form";
import { loginSchema } from "zod/loginIn";
import { supabase } from "supabase/supabase-client";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  // Extract form data
  const rawData = {
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  };

  // Validate with Zod
  const result = loginSchema.safeParse(rawData);

  if (!result.success) {
    // Transform Zod errors to match the expected format
    const errors: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    });

    return data({ errors }, { status: 400 });
  }

  // If validation passes, proceed with login logic
  try {
    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

    if (authError) {
      console.error("Auth error:", authError);
      return data(
        { 
          errors: { 
            general: "Invalid email or password. Please try again." 
          } 
        }, 
        { status: 400 }
      );
    }

    if (!authData.user) {
      return data(
        { errors: { general: "Login failed. Please try again." } },
        { status: 400 }
      );
    }

    // Step 2: Get user type from unified users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, user_type")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (userError) {
      console.error("User lookup error:", userError);
      return data(
        { errors: { general: "Failed to retrieve user information." } },
        { status: 500 }
      );
    }

    if (!user) {
      // User exists in auth but not in users table (data inconsistency)
      console.error("User not found in users table:", authData.user.id);
      return data(
        { 
          errors: { 
            general: "Account setup incomplete. Please contact support." 
          } 
        },
        { status: 400 }
      );
    }

    // Step 3: Route based on user type
    if (user.user_type === "student") {
      // Get student profile to check onboarding status
      const { data: student, error: studentError } = await supabase
        .from("student")
        .select("id, is_onboarded")
        .eq("id", user.id)
        .single();

      if (studentError) {
        console.error("Student lookup error:", studentError);
        return data(
          { errors: { general: "Failed to retrieve student profile." } },
          { status: 500 }
        );
      }

      // Log the login
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "user_logged_in",
        entity_type: "student",
        entity_id: user.id,
      });

      // Redirect based on onboarding status
      if (student.is_onboarded) {
        return redirect("/student-dashboard");
      } else {
        return redirect("/onboarding");
      }
    } else if (user.user_type === "staff") {
      // Get staff profile to determine role
      const { data: staff, error: staffError } = await supabase
        .from("staff")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (staffError) {
        console.error("Staff lookup error:", staffError);
        return data(
          { errors: { general: "Failed to retrieve staff profile." } },
          { status: 500 }
        );
      }

      // Log the login
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "user_logged_in",
        entity_type: "staff",
        entity_id: user.id,
      });

      // Redirect based on staff role
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
    } else {
      // Unknown user type
      console.error("Unknown user type:", user.user_type);
      return data(
        { errors: { general: "Invalid account type." } },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Unexpected login error:", error);
    
    // Handle login errors
    return data(
      {
        errors: { general: "Login failed. Please try again." },
      },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-4 p-6 md:p-10 relative">
        <div className="flex justify-center gap-2 md:justify-start relative z-10">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center">
          {/* Radial Gradient Background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(125% 125% at 50% 10%, #fff 40%, #6366f1 100%)",
            }}
          />
          <div className="w-full max-w-xs relative z-10">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/wellspring_student_image2.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  );
}