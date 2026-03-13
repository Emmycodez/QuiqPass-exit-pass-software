"use client";

import { Bell, RefreshCw, RotateCcw, TestTube2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "supabase/supabase-client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array(
    [...rawData].map((c) => c.charCodeAt(0)),
  ) as Uint8Array<ArrayBuffer>;
}

export function PwaSettingsCard() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // tracks which button is busy

  // Read current state on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, []);

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
    | string
    | undefined;

  // ── Enable / disable toggle ──────────────────────────────────────────────
  const handleToggle = async (enabled: boolean) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }
    setLoading("toggle");
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!enabled) {
        // Unsubscribe from browser
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          // Remove from DB
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", user.id)
              .eq("endpoint", sub.endpoint);
          }
        }
        setIsSubscribed(false);
        toast.success("Push notifications disabled.");
      } else {
        // Re-subscribe
        if (!vapidPublicKey) {
          toast.error("VAPID key not configured.");
          return;
        }
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Notification permission denied.");
          setPermission(perm);
          return;
        }
        setPermission("granted");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const subJson = sub.toJSON();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && subJson.keys?.p256dh && subJson.keys?.auth) {
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: sub.endpoint,
              p256dh: subJson.keys.p256dh,
              auth_key: subJson.keys.auth,
            },
            { onConflict: "user_id,endpoint" },
          );
        }
        setIsSubscribed(true);
        toast.success("Push notifications enabled.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  // ── Test notification ────────────────────────────────────────────────────
  const handleTest = async () => {
    if (permission !== "granted") {
      toast.error("Notifications are not enabled.");
      return;
    }
    setLoading("test");
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("QuiqPass", {
        body: "This is a test notification from QuiqPass.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
      toast.success("Test notification sent!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test notification.");
    } finally {
      setLoading(null);
    }
  };

  // ── Update service worker ────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    setLoading("update");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (reg) {
        await reg.update();
        toast.success("Service worker updated. Refresh to apply.");
      } else {
        toast("No service worker found.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    } finally {
      setLoading(null);
    }
  };

  // ── Force re-subscribe ───────────────────────────────────────────────────
  const handleForceResubscribe = async () => {
    if (!vapidPublicKey) {
      toast.error("VAPID key not configured.");
      return;
    }
    setLoading("resubscribe");
    try {
      const reg = await navigator.serviceWorker.ready;
      // Unsubscribe existing
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // Request permission if needed
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notification permission denied.");
        return;
      }

      // Fresh subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const subJson = sub.toJSON();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && subJson.keys?.p256dh && subJson.keys?.auth) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: subJson.keys.p256dh,
            auth_key: subJson.keys.auth,
          },
          { onConflict: "user_id,endpoint" },
        );
      }
      setIsSubscribed(true);
      setPermission("granted");
      toast.success("Re-subscribed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Re-subscribe failed.");
    } finally {
      setLoading(null);
    }
  };

  const notificationsOn = permission === "granted" && isSubscribed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status + toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {notificationsOn
              ? "You will receive push notifications for pass updates."
              : permission === "denied"
                ? "Notifications blocked in browser settings."
                : "Enable push notifications to receive pass updates."}
          </p>
          <Switch
            checked={notificationsOn}
            onCheckedChange={handleToggle}
            disabled={permission === "denied" || loading !== null}
          />
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!notificationsOn || loading !== null}
            className="text-muted-foreground"
          >
            <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
            {loading === "test" ? "Sending…" : "Test Notification"}
          </Button>
        </div>

        <Separator />

        {/* Troubleshooting */}
        <p className="text-xs text-muted-foreground">Troubleshooting</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdate}
            disabled={loading !== null}
            className="text-muted-foreground"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {loading === "update" ? "Updating…" : "Update Service Worker"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceResubscribe}
            disabled={loading !== null}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {loading === "resubscribe"
              ? "Re-subscribing…"
              : "Force Re-subscribe"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
