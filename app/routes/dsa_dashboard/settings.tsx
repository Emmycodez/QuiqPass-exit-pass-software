import { useState } from "react";
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
import { Bell, Save, User } from "lucide-react";
import { useAuth } from "~/contexts/auth-context";

export default function CSOSettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoForwardNotifications, setAutoForwardNotifications] =
    useState(false);
  const [approvalNotifications, setApprovalNotifications] = useState(true);

  const [name, setName] = useState(user?.name || "Dr. Johnson");
  const [email, setEmail] = useState(user?.email || "cso@university.edu");
  const [phone, setPhone] = useState("+233 24 999 8888");
  const [office, setOffice] = useState("CSO Office, Main Administration");
  const [autoApprovalMessage, setAutoApprovalMessage] = useState(
    "Your pass request has been approved. Please ensure you follow all university exit protocols.",
  );
  const [autoDenialMessage, setAutoDenialMessage] = useState(
    "Your pass request has been denied. Please contact the CSO office for more information.",
  );

  const handleSaveProfile = () => {
    console.log("Profile saved");
  };

  const handleSaveNotifications = () => {
    console.log("Notification settings saved");
  };

  const handleSaveMessages = () => {
    console.log("Auto-messages saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure CSO dashboard preferences
        </p>
      </div>

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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office">Office Location</Label>
              <Input
                id="office"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

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
                Get notified when porters forward new requests
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
