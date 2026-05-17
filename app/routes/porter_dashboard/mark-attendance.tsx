import { ArrowLeft, Loader2, Plane, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { Route } from "./+types/mark-attendance";

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  matric_no: string | null;
  photo_url: string | null;
  onPass: boolean;
};

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get("roomId");
  const hostelId = url.searchParams.get("hostelId");
  if (!roomId || !hostelId) throw redirect("/porter-dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const today = new Date().toISOString().split("T")[0];

  // If already marked today, go back to rooms
  const { data: existing } = await supabase
    .from("attendance_session")
    .select("id")
    .eq("room_id", roomId)
    .eq("date", today)
    .single();

  if (existing) throw redirect(`/porter-dashboard/rooms?hostelId=${hostelId}`);

  // Fetch room info
  const { data: room } = await supabase
    .from("room")
    .select("id, name, hostel_id")
    .eq("id", roomId)
    .single();

  if (!room) throw redirect("/porter-dashboard");

  // Students store room_number as a plain number ("34") while room.name is "Room 34"
  const roomNumber = room.name.replace(/^Room\s+/i, "");

  const { data: students } = await supabase
    .from("student")
    .select("id, first_name, last_name, matric_no, photo_url")
    .eq("hostel_id", hostelId)
    .eq("room_number", roomNumber);

  const studentList = students ?? [];
  if (studentList.length === 0) {
    return { room, hostelId, students: [] as StudentRow[] };
  }

  // Check which students have an active pass today
  const studentIds = studentList.map((s) => s.id);
  const { data: activePasses } = await supabase
    .from("pass")
    .select("student_id")
    .in("student_id", studentIds)
    .eq("status", "cso_approved")
    .lte("departure_date", today)
    .gte("return_date", today);

  const onPassIds = new Set((activePasses ?? []).map((p) => p.student_id));

  const enrichedStudents: StudentRow[] = studentList.map((s) => ({
    ...s,
    onPass: onPassIds.has(s.id),
  }));

  return { room, hostelId, students: enrichedStudents };
}

export default function MarkAttendancePage() {
  const { room, hostelId, students } = useLoaderData() as Awaited<
    ReturnType<typeof clientLoader>
  >;

  // attendance map: studentId → "present" | "absent"
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>(
    () => {
      const initial: Record<string, "present" | "absent"> = {};
      for (const s of students) {
        initial[s.id] = s.onPass ? "absent" : "present";
      }
      return initial;
    }
  );
  const [submitting, setSubmitting] = useState(false);

  function toggle(studentId: string) {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from("attendance_session")
        .insert({
          porter_id: user.id,
          hostel_id: hostelId,
          room_id: room.id,
          date: today,
        })
        .select("id")
        .single();

      if (sessionError || !session) {
        throw new Error(sessionError?.message ?? "Failed to create session");
      }

      // Bulk insert entries
      const entries = students.map((s) => ({
        session_id: session.id,
        student_id: s.id,
        status: attendance[s.id],
        on_pass: s.onPass,
      }));

      const { error: entriesError } = await supabase
        .from("attendance_entry")
        .insert(entries);

      if (entriesError) throw new Error(entriesError.message);

      toast.success(`Attendance marked for ${room.name}`);
      // Navigate back to rooms list
      window.location.href = `/porter-dashboard/rooms?hostelId=${hostelId}`;
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit attendance. Please try again.");
      setSubmitting(false);
    }
  }

  const presentCount = Object.values(attendance).filter((v) => v === "present").length;
  const absentCount = Object.values(attendance).filter((v) => v === "absent").length;

  function getInitials(first: string, last: string) {
    return (first[0] ?? "") + (last[0] ?? "");
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/porter-dashboard/rooms?hostelId=${hostelId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-muted-foreground">
            Tap a student card to toggle present / absent
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
          <UserCheck className="h-3.5 w-3.5" />
          {presentCount} Present
        </Badge>
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
          <UserX className="h-3.5 w-3.5" />
          {absentCount} Absent
        </Badge>
      </div>

      {/* Student cards */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No students in this room</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No students are assigned to {room.name}.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
            const status = attendance[student.id];
            const isPresent = status === "present";

            return (
              <Card
                key={student.id}
                onClick={() => toggle(student.id)}
                className={`cursor-pointer transition-all select-none ${
                  isPresent
                    ? "border-green-400 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={student.photo_url ?? undefined}
                        alt={student.first_name}
                      />
                      <AvatarFallback>
                        {getInitials(student.first_name, student.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.matric_no && (
                        <p className="text-xs text-muted-foreground truncate">
                          {student.matric_no}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {student.onPass && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] gap-0.5 px-1.5 py-0">
                            <Plane className="h-2.5 w-2.5" />
                            On Pass
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${
                            isPresent
                              ? "bg-green-200 text-green-800 hover:bg-green-200"
                              : "bg-red-200 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </Badge>
                      </div>
                    </div>
                    {isPresent ? (
                      <UserCheck className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <UserX className="h-5 w-5 text-red-500 shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fixed submit button */}
      {students.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/95 backdrop-blur border-t p-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Submit Attendance ({presentCount} present, {absentCount} absent)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
