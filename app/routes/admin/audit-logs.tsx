import { ClipboardList, Loader2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import Loader from "~/components/loader";
import type { Route } from "./+types/audit-logs";

export async function clientLoader() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw redirect("/staff-login");

  const { data: logs } = await supabase
    .from("audit_log")
    .select("id, action, table_name, record_id, performed_by, details, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const performerIds = [...new Set((logs ?? []).map((l) => l.performed_by).filter(Boolean))];
  const { data: staffList } = performerIds.length
    ? await supabase
        .from("staff")
        .select("id, first_name, last_name, role")
        .in("id", performerIds)
    : { data: [] };

  const staffMap: Record<string, { name: string; role: string }> = {};
  for (const s of staffList ?? []) {
    staffMap[s.id] = { name: `${s.first_name} ${s.last_name}`, role: s.role };
  }

  return { logs: logs ?? [], staffMap };
}

export function HydrateFallback() {
  return <Loader />;
}

const actionColors: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

export default function AdminAuditLogsPage({ loaderData }: Route.ComponentProps) {
  const { logs: initial, staffMap } = loaderData;
  const [logs, setLogs] = useState(initial);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const filtered = logs.filter((l) => {
    const performer = staffMap[l.performed_by]?.name ?? l.performed_by ?? "";
    return `${l.action} ${l.table_name} ${l.record_id} ${performer}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.delete(l.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => next.add(l.id));
        return next;
      });
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const ids = [...selected];
      const { error } = await supabase.from("audit_log").delete().in("id", ids);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => !selected.has(l.id)));
      setSelected(new Set());
      toast.success(`${ids.length} log${ids.length > 1 ? "s" : ""} deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete logs.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Audit Logs"
        subText="System-wide record of all data changes"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search action, table, or performer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {deleting ? "Deleting…" : `Delete ${selected.size} selected`}
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-8 w-8" />
                    <p className="text-sm">No audit logs found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const performer = staffMap[log.performed_by];
                return (
                  <TableRow
                    key={log.id}
                    data-state={selected.has(log.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(log.id)}
                        onCheckedChange={() => toggleOne(log.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${actionColors[log.action] ?? "bg-gray-100 text-gray-800"} hover:opacity-100`}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{log.table_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">
                      {log.record_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {performer ? (
                        <div>
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{performer.role}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">
                          {log.performed_by ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
