import { CalendarIcon, CheckCircle2, Search, UserX } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/attendance";

function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplay(dateStr: string): string {
  return toLocalDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const { data: staff } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!staff || staff.role !== "DSA") throw redirect("/dsa-dashboard");

  const url = new URL(request.url);
  const today = new Date().toISOString().split("T")[0];
  const dateFrom = url.searchParams.get("dateFrom") ?? today;
  const dateTo = url.searchParams.get("dateTo") ?? dateFrom;
  const hostelId = url.searchParams.get("hostelId") ?? "all";

  const [hostelsRes, sessionsRes] = await Promise.all([
    supabase.from("hostel").select("id, name, gender").order("name"),
    supabase
      .from("attendance_session")
      .select(`
        id, date, created_at,
        room:room_id ( name ),
        hostel:hostel_id ( id, name ),
        porter:porter_id ( first_name, last_name )
      `)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("created_at", { ascending: false }),
  ]);

  let sessions = sessionsRes.data ?? [];
  if (hostelId !== "all") {
    sessions = sessions.filter((s: any) => s.hostel?.id === hostelId);
  }

  const sessionIds = sessions.map((s: any) => s.id);
  const { data: entries } = sessionIds.length
    ? await supabase
        .from("attendance_entry")
        .select("session_id, status, on_pass")
        .in("session_id", sessionIds)
    : { data: [] };

  const entryCounts: Record<string, { present: number; absent: number; onPass: number }> = {};
  for (const e of entries ?? []) {
    if (!entryCounts[e.session_id]) entryCounts[e.session_id] = { present: 0, absent: 0, onPass: 0 };
    if (e.status === "present") entryCounts[e.session_id].present++;
    else entryCounts[e.session_id].absent++;
    if (e.on_pass) entryCounts[e.session_id].onPass++;
  }

  return {
    dateFrom,
    dateTo,
    hostelId,
    hostels: hostelsRes.data ?? [],
    sessions: sessions.map((s: any) => ({
      ...s,
      counts: entryCounts[s.id] ?? { present: 0, absent: 0, onPass: 0 },
    })),
  };
}

export function HydrateFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="flex gap-3">
        <div className="h-9 w-52 bg-muted animate-pulse rounded" />
        <div className="h-9 w-48 bg-muted animate-pulse rounded" />
        <div className="h-9 w-52 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}

export default function DSAAttendancePage({ loaderData }: Route.ComponentProps) {
  const { dateFrom, dateTo, hostelId, hostels, sessions } = loaderData;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: toLocalDate(dateFrom),
    to: toLocalDate(dateTo),
  });

  const isRange = dateFrom !== dateTo;

  const filtered = sessions.filter((s: any) =>
    s.room?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.hostel?.name?.toLowerCase().includes(search.toLowerCase())
  );

  function navigate(params: Record<string, string>) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    window.location.href = url.toString();
  }

  function applyRange() {
    if (!range?.from) return;
    const newFrom = formatISO(range.from);
    const newTo = range.to ? formatISO(range.to) : newFrom;
    setOpen(false);
    navigate({ dateFrom: newFrom, dateTo: newTo, hostelId });
  }

  function selectToday() {
    const today = new Date();
    setRange({ from: today, to: today });
  }

  const triggerLabel =
    dateFrom === dateTo
      ? formatDisplay(dateFrom)
      : `${formatDisplay(dateFrom)} – ${formatDisplay(dateTo)}`;

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Attendance Records"
        subText="View daily hostel attendance submitted by porters"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 px-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal gap-2",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {triggerLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-between border-t p-3 gap-2">
              <Button variant="ghost" size="sm" onClick={selectToday}>
                Today
              </Button>
              <Button size="sm" onClick={applyRange} disabled={!range?.from}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={hostelId}
          onValueChange={(v) => navigate({ dateFrom, dateTo, hostelId: v })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All hostels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hostels</SelectItem>
            {hostels.map((h: any) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search room or hostel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-52"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Total Present</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {sessions.reduce((acc: number, s: any) => acc + s.counts.present, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Total Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              {sessions.reduce((acc: number, s: any) => acc + s.counts.absent, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No records found</h3>
          <p className="text-sm text-muted-foreground">
            No attendance was marked for the selected date and hostel.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isRange && <TableHead>Date</TableHead>}
                <TableHead>Hostel</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>On Pass</TableHead>
                <TableHead>Marked by</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  {isRange && (
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDisplay(s.date)}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{s.hostel?.name}</TableCell>
                  <TableCell>{s.room?.name}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {s.counts.present}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.counts.absent > 0 ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                        <UserX className="h-3 w-3" />
                        {s.counts.absent}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.counts.onPass > 0 ? (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        {s.counts.onPass}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.porter?.first_name} {s.porter?.last_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
