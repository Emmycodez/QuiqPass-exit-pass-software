import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Route } from "./+types/rooms";

type RoomRow = {
  id: string;
  name: string;
  capacity: number | null;
  hostel_id: string;
  hostel: { name: string } | null;
  created_at: string;
};

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
    rooms: (roomsRes.data ?? []) as RoomRow[],
  };
}

export default function AdminRoomsPage({ loaderData }: Route.ComponentProps) {
  const { hostels, rooms: initial } = loaderData;
  const [rooms, setRooms] = useState<RoomRow[]>(initial);
  const [hostelFilter, setHostelFilter] = useState("all");

  // Single add
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "", hostelId: "" });
  const [saving, setSaving] = useState(false);

  // Bulk add
  const [bulk, setBulk] = useState({ hostelId: "", prefix: "Room", from: "1", to: "", capacity: "4" });
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkCount = (() => {
    const f = parseInt(bulk.from);
    const t = parseInt(bulk.to);
    return !isNaN(f) && !isNaN(t) && t >= f ? t - f + 1 : 0;
  })();

  // Edit
  const [editRoom, setEditRoom] = useState<RoomRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", capacity: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete
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

      await supabase.from("audit_log").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "room_created",
        entity_type: "room",
        entity_id: data.id,
        details: { name: form.name.trim(), hostel_id: form.hostelId },
      });

      setRooms((prev) => [data as RoomRow, ...prev]);
      setForm({ name: "", capacity: "", hostelId: "" });
      setOpen(false);
      toast.success("Room created.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkCreate() {
    if (!bulk.hostelId) { toast.error("Please select a hostel."); return; }
    if (!bulk.prefix.trim()) { toast.error("Please enter a room prefix."); return; }
    if (bulkCount === 0) { toast.error("Invalid room range."); return; }
    if (bulkCount > 200) { toast.error("Maximum 200 rooms at once."); return; }

    setBulkSaving(true);
    try {
      const from = parseInt(bulk.from);
      const to = parseInt(bulk.to);
      const capacity = bulk.capacity ? parseInt(bulk.capacity) : null;
      const hostelName = hostels.find((h) => h.id === bulk.hostelId)?.name ?? "";

      const rows = Array.from({ length: to - from + 1 }, (_, i) => ({
        name: `${bulk.prefix.trim()} ${from + i}`,
        hostel_id: bulk.hostelId,
        capacity,
      }));

      const { data, error } = await supabase
        .from("room")
        .insert(rows)
        .select("id, name, capacity, hostel_id, created_at");

      if (error) throw error;

      const newRooms: RoomRow[] = (data ?? []).map((r) => ({
        ...r,
        hostel: { name: hostelName },
      }));

      await supabase.from("audit_log").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "rooms_created_bulk",
        entity_type: "room",
        entity_id: bulk.hostelId,
        details: { count: newRooms.length, hostel_id: bulk.hostelId, prefix: bulk.prefix, from: bulk.from, to: bulk.to },
      });

      setRooms((prev) => [...newRooms, ...prev]);
      setBulk({ hostelId: "", prefix: "Room", from: "1", to: "", capacity: "4" });
      setOpen(false);
      toast.success(`${newRooms.length} rooms created.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create rooms.");
    } finally {
      setBulkSaving(false);
    }
  }

  function openEdit(room: RoomRow) {
    setEditRoom(room);
    setEditForm({ name: room.name, capacity: room.capacity?.toString() ?? "" });
  }

  async function handleEdit() {
    if (!editRoom || !editForm.name.trim()) {
      toast.error("Room name is required.");
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("room")
        .update({
          name: editForm.name.trim(),
          capacity: editForm.capacity ? parseInt(editForm.capacity) : null,
        })
        .eq("id", editRoom.id);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "room_updated",
        entity_type: "room",
        entity_id: editRoom.id,
        details: { name: editForm.name.trim(), capacity: editForm.capacity ? parseInt(editForm.capacity) : null },
      });

      setRooms((prev) =>
        prev.map((r) =>
          r.id === editRoom.id
            ? { ...r, name: editForm.name.trim(), capacity: editForm.capacity ? parseInt(editForm.capacity) : null }
            : r
        )
      );
      setEditRoom(null);
      toast.success("Room updated.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update room.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from("room").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "room_deleted",
        entity_type: "room",
        entity_id: id,
      });

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
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
            <Tabs defaultValue="single" className="pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="single" className="flex-1">Single</TabsTrigger>
                <TabsTrigger value="bulk" className="flex-1">Bulk</TabsTrigger>
              </TabsList>

              {/* Single */}
              <TabsContent value="single" className="space-y-4 pt-2">
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
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Room 1 Up, Room 1 Down"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Capacity (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="e.g. 4"
                  />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {saving ? "Creating…" : "Create Room"}
                </Button>
              </TabsContent>

              {/* Bulk */}
              <TabsContent value="bulk" className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Hostel *</Label>
                  <Select value={bulk.hostelId} onValueChange={(v) => setBulk({ ...bulk, hostelId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                    <SelectContent>
                      {hostels.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Room Prefix *</Label>
                  <Input
                    value={bulk.prefix}
                    onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })}
                    placeholder="e.g. Room, Block A Room"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>From *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bulk.from}
                      onChange={(e) => setBulk({ ...bulk, from: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>To *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={bulk.to}
                      onChange={(e) => setBulk({ ...bulk, to: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Default Capacity (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={bulk.capacity}
                    onChange={(e) => setBulk({ ...bulk, capacity: e.target.value })}
                    placeholder="e.g. 4"
                  />
                </div>
                {bulkCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Will create <strong>{bulkCount} rooms</strong>: {bulk.prefix} {bulk.from} → {bulk.prefix} {bulk.to}
                  </p>
                )}
                <Button className="w-full" onClick={handleBulkCreate} disabled={bulkSaving || bulkCount === 0}>
                  {bulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {bulkSaving ? "Creating…" : `Create ${bulkCount > 0 ? bulkCount : ""} Rooms`}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editRoom} onOpenChange={(o) => { if (!o) setEditRoom(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Room</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Room Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Capacity</Label>
              <Input
                type="number"
                min="1"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                placeholder="e.g. 4"
              />
            </div>
            <Button className="w-full" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                        {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                    </div>
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
