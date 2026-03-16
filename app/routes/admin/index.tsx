import { redirect, useLoaderData } from "react-router";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  IconBuilding,
  IconCalendar,
  IconClipboardCheck,
  IconClipboardList,
  IconDoor,
  IconShield,
  IconUsers,
  IconFileText,
} from "@tabler/icons-react";
import type { Route } from "./+types/index";

export async function clientLoader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const today = new Date().toISOString().split("T")[0];

  const [
    studentsRes,
    staffRes,
    hostelsRes,
    roomsRes,
    passesTodayRes,
    pendingPassesRes,
    activePassesRes,
    attendanceTodayRes,
  ] = await Promise.all([
    supabase.from("student").select("id", { count: "exact", head: true }),
    supabase.from("staff").select("id", { count: "exact", head: true }).neq("role", "admin"),
    supabase.from("hostel").select("id", { count: "exact", head: true }),
    supabase.from("room").select("id", { count: "exact", head: true }),
    supabase.from("pass").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
    supabase.from("pass").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("pass").select("id", { count: "exact", head: true }).eq("status", "cso_approved"),
    supabase.from("attendance_session").select("id", { count: "exact", head: true }).eq("date", today),
  ]);

  return {
    stats: {
      students: studentsRes.count ?? 0,
      staff: staffRes.count ?? 0,
      hostels: hostelsRes.count ?? 0,
      rooms: roomsRes.count ?? 0,
      passesToday: passesTodayRes.count ?? 0,
      pendingPasses: pendingPassesRes.count ?? 0,
      activePasses: activePassesRes.count ?? 0,
      attendanceToday: attendanceTodayRes.count ?? 0,
    },
  };
}

const statCards = [
  { key: "students", label: "Total Students", icon: IconUsers, color: "text-blue-600" },
  { key: "staff", label: "Total Staff", icon: IconShield, color: "text-purple-600" },
  { key: "hostels", label: "Hostels", icon: IconBuilding, color: "text-emerald-600" },
  { key: "rooms", label: "Rooms", icon: IconDoor, color: "text-orange-600" },
  { key: "passesToday", label: "Passes Today", icon: IconFileText, color: "text-indigo-600" },
  { key: "pendingPasses", label: "Pending Requests", icon: IconClipboardList, color: "text-yellow-600" },
  { key: "activePasses", label: "Active Passes", icon: IconClipboardCheck, color: "text-green-600" },
  { key: "attendanceToday", label: "Attendance Sessions Today", icon: IconCalendar, color: "text-rose-600" },
] as const;

export default function AdminIndexPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Admin Dashboard"
        subText="System-wide overview for QuiqPass"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground font-normal">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${color}`}>{stats[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
