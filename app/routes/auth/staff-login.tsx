import { useState } from "react";
import { Form, data } from "react-router";
import { supabase } from "supabase/supabase-client";
import Logo from "~/components/global/logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CheckCircle, Mail, AlertCircle } from "lucide-react";
import type { Route } from "./+types/staff-login";


/*
Dsa Login Credentials: email: dsa@welsu.edu.ng, password: password123
*/

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));

  // Validate email
  if (!email || !email.includes("@")) {
    return data(
      { 
        error: "Please enter a valid email address.",
        success: false ,
        message: null
      },
      { status: 400 }
    );
  }

  try {
    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return data(
        { 
          error: error.message,
          success: false ,
          message: null
        },
        { status: 400 }
      );
    }

    return data(
      { 
        success: true,
        message: "Check your email for the login link!",
        error: null
      },
      { status: 200 }
    );
  } catch (error) {
    return data(
      { 
        error: "Failed to send login link. Please try again.",
        success: false ,
        message: null
      },
      { status: 500 }
    );
  }
}

export default function StaffLoginPage({ actionData }: Route.ComponentProps) {
  const [email, setEmail] = useState("");

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
                <h1 className="text-2xl font-bold text-gray-900">Staff Login</h1>
                <p className="text-gray-600 mt-2">
                  Enter your official email to receive a login link
                </p>
              </div>

              {/* Success Message */}
              {actionData?.success && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {actionData.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {actionData?.error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              {!actionData?.success ? (
                <Form method="post" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Official Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.name@oau.edu.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Use your official university email address
                    </p>
                  </div>

                  <Button type="submit" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Send Login Link
                  </Button>
                </Form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      What's next?
                    </h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Check your email inbox ({email})</li>
                      <li>Click the "Log in to Wellspring" link</li>
                      <li>You'll be automatically logged in</li>
                    </ol>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    Send another link
                  </Button>
                </div>
              )}

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