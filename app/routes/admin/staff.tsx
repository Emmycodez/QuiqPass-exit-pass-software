import { Loader2, Plus, Search, ShieldOff } from "lucide-react";
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
import type { Route } from "./+types/staff";

const ROLES = ["DSA", "CSO", "Assistant CSO", "porter", "Security", "admin"] as const;
type Role = (typeof ROLES)[number];

export async function clientLoader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const { data: staffList } = await supabase
    .from("staff")
    .select("id, first_name, last_name, email, role, gender, created_at")
    .order("created_at", { ascending: false });

  return { staffList: staffList ?? [] };
}

export default function AdminStaffPage({ loaderData }: Route.ComponentProps) {
  const { staffList } = loaderData;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "" as Role | "",
    gender: "",
  });
  const [list, setList] = useState(staffList);

  const filtered = list.filter((s) => {
    const matchesSearch =
      `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleCreate() {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            role: form.role,
            gender: form.gender || undefined,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to create staff");

      toast.success(`${form.firstName} ${form.lastName} created successfully.`);
      setList((prev) => [
        {
          id: result.id,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          role: form.role,
          gender: form.gender || null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "", gender: "" });
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create staff member.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    DSA: "bg-purple-100 text-purple-800",
    CSO: "bg-blue-100 text-blue-800",
    "Assistant CSO": "bg-blue-50 text-blue-700",
    porter: "bg-green-100 text-green-800",
    Security: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <DashboardHeaders mainText="Staff Management" subText="Create and manage staff accounts" />

      {/* Filters + Create */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.role === "porter" && (
                <div className="space-y-1.5">
                  <Label>Gender (required for porters)</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {submitting ? "Creating…" : "Create Staff Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[s.role] ?? "bg-gray-100 text-gray-800"} hover:opacity-100`}>
                      {s.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{s.gender ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
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
