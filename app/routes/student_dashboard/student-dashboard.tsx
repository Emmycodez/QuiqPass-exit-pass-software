import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { Suspense } from "react";
import toast from "react-hot-toast";
import { Link, redirect } from "react-router";
import { createServerSupabase } from "supabase/server";
import { DashboardHeaders } from "~/components/dashboard";
import DashboardSkeleton from "~/components/dashboard-skeleton";
import NoDataPage from "~/components/global/no-data";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getStatusColor, getStatusIcon } from "~/services/getPassStatusService";
import type { Route } from "./+types/layout";
import { getCards } from "./data";
import { supabase } from "supabase/supabase-client";
import Loader from "~/components/loader";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    supabase.auth.signOut();
    return redirect("/login");
  }

  const userId = user.id;

  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("*")
    .eq("id", userId)
    .single();

  if (studentError || !student) {
    return redirect("/login");
  }

  const { data: passes, error: passesError } = await supabase
    .from("pass")
    .select("*")
    .eq("student_id", userId)
    .order("requested_at", { ascending: false })
    .limit(5);

  // console.log("Passes data:", passes);

  if (passesError) {
    toast.error("Failed to load your passes. Please try again.");
    return redirect("/student-dashboard");
  }

  const totalPasses = passes ? passes.length : 0;
  const pendingCount = passes
    ? passes.filter((pass) => pass.status === "pending").length
    : 0;
  const approvedCount = passes
    ? passes.filter((pass) => pass.status === "approved").length
    : 0;
  const deniedCount = passes
    ? passes.filter((pass) => pass.status === "denied").length
    : 0;

  return {
    student,
    recentPasses: passes ?? [],
    stats: {
      total: totalPasses,
      pending: pendingCount,
      approved: approvedCount,
      denied: deniedCount,
    },
  };
}

export function HydrateFallback() {
  return <Loader />;
}

type StudentLoaderData = Exclude<
  Awaited<ReturnType<typeof clientLoader>>,
  Response
>;


// TODO: Implement recent pass fetch details when a recent pass is clicked 
const StudentDashboard = ({
  loaderData,
}: {
  loaderData?: StudentLoaderData | null;
}) => {
  const cards = getCards(
    loaderData?.stats ?? { total: 0, pending: 0, approved: 0, denied: 0 }
  );
  const recentPasses = loaderData?.recentPasses ?? [];
  const student = loaderData?.student;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <main className="w-full space-y-6">
        <DashboardHeaders
          mainText="Student Dashboard"
          subText={`Welcome back ${student?.firstName ?? ""}! Here's your exit pass overview`}
          buttonText="Apply for Pass"
          buttonLink="/student-dashboard/apply-for-pass"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md font-semibold text-blue-950">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.valueClass}`}>
                  {card.value}
                </div>
                <p className="text-xs text-gray-800">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Passes */}
        <Card className="text-gray-800 bg-gray-50">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-gray-800">
              <CardTitle className="text-blue-950 text-lg font-semibold">
                Recent Requests
              </CardTitle>
              <CardDescription className="text-gray-800">
                Your latest exit pass applications
              </CardDescription>
            </div>
            <Link to="/student-dashboard/my-pass-requests">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-800">
              {recentPasses.length < 1 ? (
                <NoDataPage text="No Recent Passes" />
              ) : (
                recentPasses.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {getStatusIcon(request.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {request.type == "long"
                              ? "Long Pass"
                              : "Short Pass"}
                          </p>
                          <Badge
                            variant="outline"
                            className={getStatusColor(request.status)}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(request.created_at).toLocaleString(
                              "en-NG",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <p className="text-sm ">
                        Submitted{" "}
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </Suspense>
  );
};

export default StudentDashboard;
