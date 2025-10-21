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
    // Your login logic here
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

    if (authError) {
      console.log("Auth error:", authError);
      return data({ errors: { general: authError.message } }, { status: 400 });
    }

    // Redirect to dashboard if successful
    return redirect("/dashboard");
  } catch (error) {
    // Handle registration errors
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
