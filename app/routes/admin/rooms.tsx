import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { redirect, useLoaderData } from "react-router";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import type { Route } from "./+types/rooms";

export async function clientLoader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const [hostelsRes, roomsRes] = await Promise.all([
    supabase.from("hostel").select("id, name").order("name"),
    supabase
      .from("room")
      .select("id, name, capacity, hostel_id, hostel:hostel_id(name), created_at")
      .order("name"),
  ]);

  return {
    hostels: hostelsRes.data ?? [],
    rooms: roomsRes.data ?? [],
  };
}

export default function AdminRoomsPage({ loaderData }: Route.ComponentProps) {
  const { hostels, rooms: initial } = loaderData;
  const [rooms, setRooms] = useState(initial);
  const [hostelFilter, setHostelFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "", hostelId: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = hostelFilter === "all"
    ? rooms
    : rooms.filter((r) => r.hostel_id === hostelFilter);

  async function handleCreate() {
    if (!form.name.trim() || !form.hostelId) {
      toast.error("Room name and hostel are required.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("room")
        .insert({
          name: form.name.trim(),
          hostel_id: form.hostelId,
          capacity: form.capacity ? parseInt(form.capacity) : null,
        })
        .select("id, name, capacity, hostel_id, hostel:hostel_id(name), created_at")
        .single();

      if (error) throw error;
      setRooms((prev) => [data, ...prev]);
      setForm({ name: "", capacity: "", hostelId: "" });
      setOpen(false);
      toast.success("Room created.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from("room").delete().eq("id", id);
      if (error) throw error;
      setRooms((prev) => prev.filter((r) => r.id !== id));
      toast.success("Room deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders mainText="Room Management" subText="Add and manage hostel rooms" />

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Select value={hostelFilter} onValueChange={setHostelFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All hostels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All hostels</SelectItem>
            {hostels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Room</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Hostel *</Label>
                <Select value={form.hostelId} onValueChange={(v) => setForm({ ...form, hostelId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Room Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Room 101" />
              </div>
              <div className="space-y-1.5">
                <Label>Capacity (optional)</Label>
                <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 4" />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {saving ? "Creating…" : "Create Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Hostel</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No rooms found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(r.hostel as { name: string } | null)?.name ?? "—"}
                  </TableCell>
                  <TableCell>{r.capacity ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                      {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
