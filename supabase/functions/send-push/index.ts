import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — webpush is available via esm.sh in the Deno runtime
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Shape of the record inserted into the `notification` table
interface NotificationRecord {
  id: string;
  recipient_id: string;
  recipient_type: "student" | "staff";
  message: string;
  pass_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: NotificationRecord;
  schema: string;
}

Deno.serve(async (req) => {
  try {
    // Only accept POST from the Supabase webhook
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload: WebhookPayload = await req.json();
    const { record } = payload;

    if (!record?.recipient_id) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Use service-role client so RLS is bypassed — we need to read subscriptions
    // for ANY user, not just the authenticated request user.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all push subscriptions for the recipient
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", record.recipient_id);

    if (error) {
      console.error("Failed to fetch push subscriptions:", error);
      return new Response("DB error", { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      // No subscriptions — nothing to send, but it's not an error
      return new Response("No subscriptions", { status: 200 });
    }

    const pushPayload = JSON.stringify({
      title: "QuiqPass",
      body: record.message,
      url: record.pass_id
        ? `/${record.recipient_type === "student" ? "student" : record.recipient_type === "staff" ? "dsa" : "cso"}-dashboard/pass-requests`
        : "/",
    });

    // Send to every registered device, in parallel
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          pushPayload
        )
      )
    );

    // Remove stale subscriptions (410 Gone = device unsubscribed)
    const staleEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleEndpoints.push(subscriptions[i].endpoint);
        } else {
          console.error("Push send error:", result.reason);
        }
      }
    });

    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
