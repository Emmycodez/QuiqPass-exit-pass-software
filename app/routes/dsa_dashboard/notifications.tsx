import { Bell, CheckCircle, Clock, Search } from "lucide-react";
import { useState } from "react";
import { Form, redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import Loader from "~/components/loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/notifications";
import toast from "react-hot-toast";

type NotificationRow = {
  id: string;
  type: "email" | "system" | "sms";
  message: string | null;
  is_read: boolean;
  created_at: string;
  pass_id?: string | null;
  pass?: {
    id: string;
    type: string | null;
    destination: string | null;
    status?: string | null;
  } | null;
};

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/staff-login");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("role")
    .eq("id", user.id)
    .single();

  if (staffError || !staff || staff.role !== "DSA") {
    toast.error("Unauthorized access");
    throw redirect("/login");
  }

  const { data: rawNotifications, error } = await supabase
    .from("notification")
    .select(
      `
      id,
      type,
      message,
      is_read,
      created_at,
      pass:pass_id(id, type, destination, status)
    `
    )
    .eq("recipient_id", user.id)
    .eq("recipient_type", "staff")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], error: "Failed to load notifications" };
  }

  const notifications: NotificationRow[] = (rawNotifications || []).map(
    (n: any) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
      pass: n.pass,
    })
  );

  return { notifications, error: null };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You must be logged in." };
    }

    if (intent === "mark-read") {
      const notificationId = formData.get("notificationId") as string;
      if (!notificationId) return { error: "Missing notificationId" };

      const { error } = await supabase
        .from("notification")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("recipient_id", user.id);

      if (error) {
        toast.error("Failed to mark notification as read");
        return { error: "Failed to mark notification as read" };
      }

      toast.success("Notification marked as read");
      return null;
    }

    if (intent === "mark-all-read") {
      const { error } = await supabase
        .from("notification")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("recipient_type", "staff")
        .eq("is_read", false);

      if (error) {
        toast.error("Failed to mark all notifications as read");
        return { error: "Failed to mark all notifications as read" };
      }

      toast.success("All notifications marked as read");
      return null;
    }

    if (intent === "delete") {
      const notificationId = formData.get("notificationId") as string;
      if (!notificationId) return { error: "Missing notificationId" };

      const { error } = await supabase
        .from("notification")
        .delete()
        .eq("id", notificationId)
        .eq("recipient_id", user.id);

      if (error) {
        toast.error("Failed to delete notification");
        return { error: "Failed to delete notification" };
      }

      toast.success("Notification deleted");
      return null;
    }

    return null;
  } catch (err) {
    console.error("clientAction error:", err);
    return { error: "Unexpected error" };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

function getNotificationIcon(kind: string) {
  switch (kind) {
    case "system":
      return <Bell className="h-5 w-5 text-gray-700" />;
    case "email":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "sms":
      return <Clock className="h-5 w-5 text-orange-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-700" />;
  }
}

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function DSANotificationsPage({
  loaderData,
}: Route.ComponentProps) {
  const { notifications, error } = loaderData;
  const [searchQuery, setSearchQuery] = useState("");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.message ?? "").toLowerCase().includes(q) ||
      (n.pass?.destination ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Notifications"
        subText={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "You're all caught up!"
        }
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>Updates about pass requests and student activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {unreadCount > 0 && (
              <Form method="post">
                <input type="hidden" name="intent" value="mark-all-read" />
                <Button type="submit" className="w-full sm:w-auto">
                  Mark all as read
                </Button>
              </Form>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg transition-colors ${
                    n.is_read
                      ? "bg-background border-border"
                      : "bg-muted/50 border-primary/20"
                  }`}
                >
                  <div className="hidden sm:block mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center flex-wrap gap-2">
                          {n.pass && (
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm"
                            >
                              {n.pass.type === "short"
                                ? "Short Pass"
                                : n.pass.type === "long"
                                  ? "Long Pass"
                                  : "Pass"}
                            </Badge>
                          )}

                          {n.pass?.destination && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                              {n.pass.destination}
                            </span>
                          )}

                          {!n.is_read && (
                            <span
                              className="h-2 w-2 rounded-full bg-primary flex-shrink-0"
                              title="Unread"
                            />
                          )}
                        </div>

                        <p className="text-sm text-foreground leading-relaxed">
                          {n.message}
                        </p>

                        <p className="text-xs text-muted-foreground sm:hidden">
                          {formatTimestamp(n.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-row sm:flex-col gap-2 items-stretch sm:items-end">
                        {!n.is_read && (
                          <Form method="post" className="flex-1 sm:flex-initial">
                            <input type="hidden" name="intent" value="mark-read" />
                            <input type="hidden" name="notificationId" value={n.id} />
                            <Button
                              type="submit"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              Mark read
                            </Button>
                          </Form>
                        )}

                        <Form method="post" className="flex flex-col">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="notificationId" value={n.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Delete
                          </Button>
                        </Form>
                      </div>
                    </div>

                    <p className="hidden sm:block text-xs text-muted-foreground">
                      {formatTimestamp(n.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
