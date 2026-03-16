import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { redirect, useLoaderData } from "react-router";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
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
import type { Route } from "./+types/hostels";

export async function clientLoader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const { data: hostels } = await supabase
    .from("hostel")
    .select("id, name, gender, created_at")
    .order("name");

  // Room count per hostel
  const { data: rooms } = await supabase.from("room").select("id, hostel_id");

  const roomCounts: Record<string, number> = {};
  for (const r of rooms ?? []) {
    roomCounts[r.hostel_id] = (roomCounts[r.hostel_id] ?? 0) + 1;
  }

  return {
    hostels: (hostels ?? []).map((h) => ({ ...h, roomCount: roomCounts[h.id] ?? 0 })),
  };
}

export default function AdminHostelsPage({ loaderData }: Route.ComponentProps) {
  const { hostels: initial } = loaderData;
  const [hostels, setHostels] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !gender) {
      toast.error("Name and gender are required.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("hostel")
        .insert({ name: name.trim(), gender })
        .select("id, name, gender, created_at")
        .single();

      if (error) throw error;
      setHostels((prev) => [{ ...data, roomCount: 0 }, ...prev]);
      setName("");
      setGender("");
      setOpen(false);
      toast.success("Hostel created.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create hostel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const { error } = await supabase.from("hostel").delete().eq("id", id);
      if (error) throw error;
      setHostels((prev) => prev.filter((h) => h.id !== id));
      toast.success("Hostel deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete hostel.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders mainText="Hostel Management" subText="Create and manage student hostels" />

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Hostel</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Hostel</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Hostel Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Block A" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {saving ? "Creating…" : "Create Hostel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hostels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">No hostels yet.</TableCell>
              </TableRow>
            ) : (
              hostels.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>
                    <Badge className={h.gender === "male" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-pink-100 text-pink-800 hover:bg-pink-100"}>
                      {h.gender}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.roomCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)} disabled={deleting === h.id}>
                      {deleting === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
