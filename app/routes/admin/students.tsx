import { Loader2, Search, Star, StarOff } from "lucide-react";
import { useState } from "react";
import { redirect, useLoaderData } from "react-router";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { Route } from "./+types/students";

export async function clientLoader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const { data: students } = await supabase
    .from("student")
    .select("id, first_name, last_name, email, matric_no, department, level, has_special_privilege, hostel_id, room_number, created_at")
    .order("created_at", { ascending: false });

  return { students: students ?? [] };
}

export default function AdminStudentsPage({ loaderData }: Route.ComponentProps) {
  const { students: initial } = loaderData;
  const [students, setStudents] = useState(initial);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.email} ${s.matric_no ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function togglePrivilege(id: string, current: boolean) {
    setToggling(id);
    try {
      const { error } = await supabase
        .from("student")
        .update({ has_special_privilege: !current })
        .eq("id", id);
      if (error) throw error;
      setStudents((prev) =>
        prev.map((s) => s.id === id ? { ...s, has_special_privilege: !current } : s)
      );
      toast.success(current ? "Special privilege removed." : "Special privilege granted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update privilege.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders mainText="Student Management" subText="View students and manage special privileges" />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search name, email, matric no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Matric No</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Special Privilege</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No students found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.matric_no ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.department ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.level ?? "—"}</TableCell>
                  <TableCell className="text-sm">{s.room_number ?? "—"}</TableCell>
                  <TableCell>
                    {s.has_special_privilege ? (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1">
                        <Star className="h-3 w-3" />Granted
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Standard</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePrivilege(s.id, s.has_special_privilege)}
                      disabled={toggling === s.id}
                    >
                      {toggling === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : s.has_special_privilege ? (
                        <><StarOff className="mr-1.5 h-3.5 w-3.5" />Revoke</>
                      ) : (
                        <><Star className="mr-1.5 h-3.5 w-3.5" />Grant</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
