import { ArrowLeft, CheckCircle2, ChevronRight, DoorOpen, Search } from "lucide-react";
import { useState } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import Loader from "~/components/loader";
import { supabase } from "supabase/supabase-client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/rooms";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const hostelId = url.searchParams.get("hostelId");
  if (!hostelId) throw redirect("/porter-dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const today = new Date().toISOString().split("T")[0];

  const [hostelRes, roomsRes, sessionsRes] = await Promise.all([
    supabase.from("hostel").select("id, name").eq("id", hostelId).single(),
    supabase
      .from("room")
      .select("id, name, capacity")
      .eq("hostel_id", hostelId)
      .order("name"),
    supabase
      .from("attendance_session")
      .select("room_id, porter_id, created_at")
      .eq("hostel_id", hostelId)
      .eq("date", today),
  ]);

  if (!hostelRes.data) throw redirect("/porter-dashboard");

  const markedRoomIds = new Set(
    (sessionsRes.data ?? []).map((s) => s.room_id)
  );

  const rooms = (roomsRes.data ?? []).map((room) => ({
    ...room,
    markedToday: markedRoomIds.has(room.id),
  }));

  return {
    hostel: hostelRes.data,
    rooms,
    hostelId,
  };
}

export function HydrateFallback() {
  return <Loader />;
}

export default function PorterRoomsPage() {
  const { hostel, rooms, hostelId } = useLoaderData() as Awaited<
    ReturnType<typeof clientLoader>
  >;

  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? rooms.filter((r) => {
        const num = r.name.replace(/^Room\s+/i, "");
        return num.startsWith(search.trim());
      })
    : rooms;

  const done = rooms.filter((r) => r.markedToday).length;
  const total = rooms.length;
  const allDone = total > 0 && done === total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/porter-dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{hostel.name}</h1>
          <p className="text-sm text-muted-foreground">
            {allDone
              ? "All rooms marked for today"
              : `${done} of ${total} rooms marked today`}
          </p>
        </div>
        {allDone && (
          <CheckCircle2 className="h-6 w-6 text-green-500 ml-auto" />
        )}
      </div>

      {/* Search */}
      {rooms.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Search room number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Rooms list */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No rooms configured</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ask the admin to add rooms for this hostel.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No rooms match "{search}"</h3>
          <p className="text-sm text-muted-foreground mt-1">Try a different number.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <Link
              key={room.id}
              to={
                room.markedToday
                  ? "#"
                  : `/porter-dashboard/mark?roomId=${room.id}&hostelId=${hostelId}`
              }
              aria-disabled={room.markedToday}
              className={room.markedToday ? "pointer-events-none" : ""}
            >
              <Card
                className={`h-full transition-shadow ${
                  room.markedToday
                    ? "opacity-60"
                    : "hover:shadow-md cursor-pointer"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      {room.name}
                    </CardTitle>
                    {room.markedToday ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {room.markedToday ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Marked
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not marked yet</Badge>
                    )}
                    {room.capacity && (
                      <span className="text-xs text-muted-foreground">
                        Cap: {room.capacity}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
