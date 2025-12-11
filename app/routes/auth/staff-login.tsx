import { useState } from "react";
import { Form, data, redirect, useNavigation } from "react-router";
import { supabase } from "supabase/supabase-client";
import Logo from "~/components/global/logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import type { Route } from "./+types/staff-login";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));

  // Enhanced email validation - supports all valid TLDs including .ng
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!email || !emailRegex.test(email)) {
    return data(
      {
        error: "Please enter a valid email address.",
      },
      { status: 400 }
    );
  }

  if (!password || password.length < 6) {
    return data(
      {
        error: "Password must be at least 6 characters.",
      },
      { status: 400 }
    );
  }

  try {
    // Sign in with email and password
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Authentication error:", authError);
      return data(
        {
          error:
            authError.message === "Invalid login credentials"
              ? "Invalid email or password. Please try again."
              : authError.message,
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return data(
        {
          error: "Login failed. Please try again.",
        },
        { status: 400 }
      );
    }
    if (!authData.user) {
      return data({ error: "Login failed." }, { status: 400 });
    }

    // Verify user is staff
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role, first_name, last_name")
      .eq("id", authData.user.id)
      .single();

    if (staffError || !staff) {
      // Sign out if not a staff member
      await supabase.auth.signOut();
      return data(
        {
          error: "Access denied. This login is for staff members only.",
        },
        { status: 403 }
      );
    }

    // Redirect based on role
    switch (staff.role) {
      case "DSA":
        throw redirect("/dsa-dashboard");
      case "CSO":
        throw redirect("/cso-dashboard");
      case "Assistant CSO":
        throw redirect("/cso-dashboard");
      case "porter":
        throw redirect("/porter-dashboard");
      case "Security":
        throw redirect("/security-dashboard");
      default:
        throw redirect("/dashboard");
    }
  } catch (error: any) {
    // If it's a redirect, throw it
    if (error?.status === 302 || error instanceof Response) {
      throw error;
    }

    console.error("Login error:", error);
    return data(
      {
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}

export default function StaffLoginPage({ actionData }: Route.ComponentProps) {
  const [email, setEmail] = useState("");
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/staff-login";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Staff Login
                </h1>
                <p className="text-gray-600 mt-2">
                  Enter your credentials to access the system
                </p>
              </div>

              {/* Error Message */}
              {actionData?.error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <Form method="post" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Official Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.name@welsu.edu.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                      title="Please enter a valid email address"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </Form>

              <div className="mt-6 text-center">
                <a
                  href="/login"
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Back to student login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/wellspring_student_image2.jpg"
          alt="Staff Login"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  );
}
