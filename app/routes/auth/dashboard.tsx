import { Loader2 } from "lucide-react";
import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { Skeleton } from "~/components/ui/skeleton";

// TODO: Optimize db by creating one user table with roles for singular query
export async function clientLoader() {
  // 1️⃣ Get the current logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirect("/login");
  }

  const email = user.email;

  // 2️⃣ Check if user exists in `student`
  const { data: student } = await supabase
    .from("student")
    .select("id, is_onboarded")
    .eq("email", email)
    .maybeSingle();

  if (student) {
    // ✅ It's a student
    if (!student.is_onboarded) {
      return redirect("/onboarding");
    }
    return redirect("/student-dashboard");
  }

  // 3️⃣ If not student, check if user exists in `staff`
  const { data: staff } = await supabase
    .from("staff")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (staff) {
    // ✅ It's a staff member
    const role = staff.role?.toLowerCase();

    if (role === "porter") {
      return redirect("/porter-dashboard");
    }

    if (role === "cso" || role === "assistant cso") {
      return redirect("/cso-dashboard");
    }

    // fallback for security or undefined roles
    return redirect("/login");
  }

  // 4️⃣ If user not found anywhere
  return redirect("/login");
}

const dashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="relative">
          <Skeleton className="h-64 w-full" />
          <h2 className="text-2xl font-semibold absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin h-4 text-primary" /> Redirecting
            you to your dashboard....
          </h2>
        </div>
      </div>
    </main>
  );
};

export default dashboard;
