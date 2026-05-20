import { Building2, CheckCircle2, ChevronRight } from "lucide-react";
import { Link, redirect, useLoaderData } from "react-router";
import Loader from "~/components/loader";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/index";

export async function clientLoader() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  // Get porter gender
  const { data: porter } = await supabase
    .from("staff")
    .select("gender")
    .eq("id", user.id)
    .single();

  if (!porter) throw redirect("/staff-login");

  // Fetch gender-filtered hostels
  const { data: hostels } = await supabase
    .from("hostel")
    .select("id, name, gender")
    .eq("gender", porter.gender ?? "");

  if (!hostels?.length) return { hostels: [], progress: {} };

  // For each hostel, check how many rooms exist and how many are marked today
  const today = new Date().toISOString().split("T")[0];

  const hostelIds = hostels.map((h) => h.id);

  const [roomsRes, sessionsRes] = await Promise.all([
    supabase
      .from("room")
      .select("id, hostel_id")
      .in("hostel_id", hostelIds),
    supabase
      .from("attendance_session")
      .select("room_id, hostel_id")
      .in("hostel_id", hostelIds)
      .eq("date", today),
  ]);

  // Build progress map: hostelId → { total, done }
  const progress: Record<string, { total: number; done: number }> = {};
  for (const hostel of hostels) {
    const total = roomsRes.data?.filter((r) => r.hostel_id === hostel.id).length ?? 0;
    const done = sessionsRes.data?.filter((s) => s.hostel_id === hostel.id).length ?? 0;
    progress[hostel.id] = { total, done };
  }

  return { hostels, progress };
}

export function HydrateFallback() {
  return <Loader />;
}

export default function PorterIndexPage() {
  const { hostels, progress } = useLoaderData() as Awaited<
    ReturnType<typeof clientLoader>
  >;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Hostel Attendance"
        subText={`Select a hostel to mark attendance — ${today}`}
      />

      {hostels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hostels assigned</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No hostels are configured for your gender. Contact the admin.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((hostel) => {
            const { total, done } = progress[hostel.id] ?? { total: 0, done: 0 };
            const allDone = total > 0 && done === total;

            return (
              <Link
                key={hostel.id}
                to={`/porter-dashboard/rooms?hostelId=${hostel.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{hostel.name}</CardTitle>
                      </div>
                      {allDone ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <CardDescription className="capitalize ml-7">
                      {hostel.gender} hostel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {total === 0 ? (
                        <Badge variant="secondary">No rooms configured</Badge>
                      ) : allDone ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          All {total} rooms marked
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {done}/{total} rooms marked today
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
