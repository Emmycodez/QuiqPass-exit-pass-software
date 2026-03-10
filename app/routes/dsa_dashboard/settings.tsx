import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { Bell, Save, User, Loader2 } from "lucide-react";
import { redirect, Form, useNavigation } from "react-router";
import { supabase } from "supabase/supabase-client";
import toast from "react-hot-toast";
import Loader from "~/components/loader";
import { DashboardHeaders } from "~/components/dashboard";
import type { Route } from "./+types/settings";

type StaffProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
};

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw redirect("/login");

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, first_name, last_name, email, role")
      .eq("id", user.id)
      .single();

    if (staffError || !staff || staff.role !== "DSA") {
      toast.error("Unauthorized access");
      throw redirect("/login");
    }

    return { staff, error: null };
  } catch (error) {
    console.error("Settings loader error:", error);
    return { staff: null, error: "Failed to load profile data" };
  }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: true, message: "Not authenticated" };

    const formData = await request.formData();
    const first_name = formData.get("firstName")?.toString().trim() ?? "";
    const last_name  = formData.get("lastName")?.toString().trim()  ?? "";

    const { error: updateError } = await supabase
      .from("staff")
      .update({ first_name, last_name })
      .eq("id", user.id);

    if (updateError) {
      toast.error("Failed to save profile.");
      return { error: true, message: "Failed to update profile." };
    }

    toast.success("Profile updated successfully!");
    return { error: false, message: "Profile updated." };
  } catch {
    toast.error("An unexpected error occurred.");
    return { error: true, message: "Unexpected error" };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

export default function DSASettingsPage({ loaderData, actionData }: Route.ComponentProps) {
  const { staff, error } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoForwardNotifications, setAutoForwardNotifications] = useState(false);
  const [approvalNotifications, setApprovalNotifications] = useState(true);
  const [autoApprovalMessage, setAutoApprovalMessage] = useState(
    "Your pass request has been approved. Please ensure you follow all university exit protocols.",
  );
  const [autoDenialMessage, setAutoDenialMessage] = useState(
    "Your pass request has been denied. Please contact the DSA office for more information.",
  );

  // Seed profile from DB
  useEffect(() => {
    if (staff) {
      setFirstName(staff.first_name ?? "");
      setLastName(staff.last_name ?? "");
    }
  }, [staff]);

  // Restore notification prefs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dsa_notification_prefs");
    if (saved) {
      const prefs = JSON.parse(saved);
      setEmailNotifications(prefs.emailNotifications ?? true);
      setPushNotifications(prefs.pushNotifications ?? true);
      setAutoForwardNotifications(prefs.autoForwardNotifications ?? false);
      setApprovalNotifications(prefs.approvalNotifications ?? true);
    }
  }, []);

  // Restore messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dsa_auto_messages");
    if (saved) {
      const msgs = JSON.parse(saved);
      if (msgs.approval) setAutoApprovalMessage(msgs.approval);
      if (msgs.denial) setAutoDenialMessage(msgs.denial);
    }
  }, []);

  const handleSaveNotifications = () => {
    localStorage.setItem("dsa_notification_prefs", JSON.stringify({
      emailNotifications,
      pushNotifications,
      autoForwardNotifications,
      approvalNotifications,
    }));
    toast.success("Notification preferences saved.");
  };

  const handleSaveMessages = () => {
    localStorage.setItem("dsa_auto_messages", JSON.stringify({
      approval: autoApprovalMessage,
      denial: autoDenialMessage,
    }));
    toast.success("Auto-response messages saved.");
  };

  if (error || !staff) {
    return (
      <div className="space-y-6">
        <DashboardHeaders
          mainText="Settings"
          subText="Configure your DSA dashboard preferences"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error ?? "Could not load profile."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Settings"
        subText="Configure your DSA dashboard preferences"
      />

      <Form method="POST" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={staff.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={staff.role}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Form>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in the app
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="forward-notifications">
                New Forwarded Requests
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when DSA forwards new requests
              </p>
            </div>
            <Switch
              id="forward-notifications"
              checked={autoForwardNotifications}
              onCheckedChange={setAutoForwardNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="approval-notifications">
                Approval Confirmations
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when you approve/deny requests
              </p>
            </div>
            <Switch
              id="approval-notifications"
              checked={approvalNotifications}
              onCheckedChange={setApprovalNotifications}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications}>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Response Messages</CardTitle>
          <CardDescription>
            Customize messages sent to students when you take action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval-message">Approval Message</Label>
            <Textarea
              id="approval-message"
              value={autoApprovalMessage}
              onChange={(e) => setAutoApprovalMessage(e.target.value)}
              rows={3}
              placeholder="Message sent when a pass is approved..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="denial-message">Denial Message Template</Label>
            <Textarea
              id="denial-message"
              value={autoDenialMessage}
              onChange={(e) => setAutoDenialMessage(e.target.value)}
              rows={3}
              placeholder="Default message when a pass is denied..."
            />
            <p className="text-xs text-muted-foreground">
              Note: You can still provide specific reasons when denying
              individual requests
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveMessages}>
              <Save className="h-4 w-4 mr-2" />
              Save Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
