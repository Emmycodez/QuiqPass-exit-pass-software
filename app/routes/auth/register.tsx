import Logo from "~/components/global/logo";
import type { Route } from "./+types/register";
import RegisterForm from "./_components/registration-form";
import { signupSchema } from "zod/signUp";
import { data } from "react-router";
import { supabase } from "supabase/supabase-client";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  // Extract form data
  const rawData = {
    firstName: String(formData.get("firstName")),
    lastName: String(formData.get("lastName")),
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    confirmPassword: String(formData.get("confirmPassword")),
  };

  // Validate with Zod
  const result = signupSchema.safeParse(rawData);

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

  // If validation passes, proceed with registration logic
  try {
    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          full_name: `${result.data.firstName} ${result.data.lastName}`,
        },
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return data(
        {
          errors: { general: authError.message },
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return data(
        {
          errors: { general: "Failed to create user account" },
        },
        { status: 400 }
      );
    }

    // Step 2: Create entry in unified users table
    const { error: usersError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: result.data.email,
      user_type: "student",
    });

    if (usersError) {
      console.error("Users table error:", usersError);
      
      // Cleanup: Delete the auth user if users table insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return data(
        { 
          errors: { 
            general: "Failed to create user profile. Please try again." 
          } 
        },
        { status: 400 }
      );
    }

    // Step 3: Create entry in student table
    const { error: studentError } = await supabase.from("student").insert({
      id: authData.user.id,
      first_name: result.data.firstName,
      last_name: result.data.lastName,
      email: result.data.email,
      is_onboarded: false,
    });

    if (studentError) {
      console.error("Student table error:", studentError);
      
      // Cleanup: Delete from users table and auth
      await supabase.from("users").delete().eq("id", authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return data(
        { 
          errors: { 
            general: "Failed to create student profile. Please try again." 
          } 
        },
        { status: 400 }
      );
    }

    // Step 4: Log the registration in audit_log
    await supabase.from("audit_log").insert({
      user_id: authData.user.id,
      action: "user_registered",
      entity_type: "student",
      entity_id: authData.user.id,
      metadata: {
        registration_method: "email_password",
      },
    });

    // Success!
    return data(
      { 
        success: true, 
        message: "Account created successfully! Please check your email to confirm your account." 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected registration error:", error);
    
    // Handle registration errors
    return data(
      {
        errors: { general: "Registration failed. Please try again." },
      },
      { status: 500 }
    );
  }
}

export default function RegisterPage() {
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
            <RegisterForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/wellspring-student_image.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  );
}