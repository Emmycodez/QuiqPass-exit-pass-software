import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import { PwaSettingsCard } from "~/components/pwa-settings-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import Loader from "~/components/loader";
import type { Route } from "./+types/settings";

export async function clientLoader() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) throw redirect("/staff-login");

  const { data: staff } = await supabase
    .from("staff")
    .select("first_name, last_name, email, role")
    .eq("id", user.id)
    .single();

  return { staff };
}

export function HydrateFallback() {
  return <Loader />;
}

export default function AdminSettingsPage({ loaderData }: Route.ComponentProps) {
  const { staff } = loaderData;

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Settings"
        subText="Manage your account settings and preferences"
      />

      <section className="space-y-3 px-4">
        <div>
          <h2 className="text-xl font-semibold">Progressive Web App</h2>
          <p className="text-sm text-muted-foreground">
            Install QuiqPass as an app and manage notifications
          </p>
        </div>
        <PwaSettingsCard />
      </section>

      <Separator className="mx-4" />

      <section className="space-y-3 px-4">
        <div>
          <h2 className="text-xl font-semibold">Account Information</h2>
          <p className="text-sm text-muted-foreground">Your account details</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your name and email address on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">
                {staff?.first_name ?? ""} {staff?.last_name ?? ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{staff?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{staff?.role ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
