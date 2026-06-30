import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { User, Mail, Phone, Users, Save, Bell, Loader2 } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { DashboardHeaders } from "~/components/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  femaleHostels,
  levels,
  MaleHostels,
} from "../../../data/onboardingData";
import { Form, useNavigation } from "react-router";
import type { Route } from "./+types/profile";
import toast from "react-hot-toast";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "supabase/supabase-client";
import { redirect } from "react-router";
import { string } from "zod";
import Loader from "~/components/loader";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  matricNo: string;
  guardianName: string;
  hostel: string;
  guardianPhoneNumber: string;
  level: string;
  roomNumber: string;
  notifyParent: boolean;
  gender?: string;
  hostel_id?: string;
};

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: true,
        message: "You must be logged in to update your profile.",
      };
    }

    const formData = await request.formData();

    // Extract form data
    const updateData = {
      first_name: formData.get("firstName")?.toString().trim(),
      last_name: formData.get("lastName")?.toString().trim(),
      phone_number: formData.get("phone")?.toString().trim(),
      email: formData.get("email")?.toString().trim(),
      level: parseInt(formData.get("level")?.toString() || "0"),
      room_number: formData.get("roomNumber")?.toString().trim(),
      guardian_name: formData.get("guardianName")?.toString().trim(),
      guardian_phone_number: formData
        .get("guardianPhoneNumber")
        ?.toString()
        .trim(),
      hostel_id: string,
    };

    // Get hostel_id from hostel name if hostel was changed
    const hostelName = formData.get("hostel")?.toString();
    if (hostelName) {
      const { data: hostel } = await supabase
        .from("hostel")
        .select("id")
        .eq("name", hostelName)
        .single();

      if (hostel) {
        updateData.hostel_id = hostel.id;
      }
    }

    // Update student profile
    const { error: updateError } = await supabase
      .from("student")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return {
        error: true,
        message: "Failed to update profile. Please try again.",
      };
    }

    // Log the action
    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "profile_updated",
      entity_type: "student",
      entity_id: user.id,
    });
    toast.success("Profile updated successfully!");
    return {
      error: false,
      message: "Profile updated successfully!",
    };
  } catch (error) {
    toast.error("An unexpected error occurred. Please try again.");
    console.error("Unexpected error updating profile:", error);
    return {
      error: true,
      message: "An unexpected error occurred",
    };
  }
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirect("/login");
    }

    // Fetch student profile with hostel information
    const { data: student, error: studentError } = await supabase
      .from("student")
      .select(
        `
        *,
        hostel:hostel_id (
          id,
          name,
          gender
        )
      `
      )
      .eq("id", user.id)
      .single();

    if (studentError) {
      console.error("Error fetching student profile:", studentError);
      return {
        student: null,
        error: "Failed to load profile information",
      };
    }

    return {
      student: student,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error in loader:", error);
    return {
      student: null,
      error: "An unexpected error occurred",
    };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

export default function ProfilePage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { student, error } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    matricNo: "",
    hostel: "",
    roomNumber: "",
    guardianName: "",
    guardianPhoneNumber: "",
    level: "",
    notifyParent: true,
  });

  // Initialize form data when student data loads
  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.first_name || "",
        lastName: student.last_name || "",
        email: student.email || "",
        phone: student.phone_number || "",
        matricNo: student.matric_no || "",
        hostel: student.hostel?.name || "",
        roomNumber: student.room_number || "",
        guardianName: student.guardian_name || "",
        guardianPhoneNumber: student.guardian_phone_number || "",
        level: student.level?.toString() || "",
        notifyParent: true,
        gender: student.gender || "",
      });
    }
  }, [student]);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    // Reset to original values
    if (student) {
      setFormData({
        firstName: student.first_name || "",
        lastName: student.last_name || "",
        email: student.email || "",
        phone: student.phone_number || "",
        matricNo: student.matric_no || "",
        hostel: student.hostel?.name || "",
        roomNumber: student.room_number || "",
        guardianName: student.guardian_name || "",
        guardianPhoneNumber: student.guardian_phone_number || "",
        level: student.level?.toString() || "",
        notifyParent: true,
        gender: student.gender || "",
      });
    }
    setIsEditing(false);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeaders
          mainText="My Profile"
          subText="Update your personal information and preferences"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <DashboardHeaders
          mainText="My Profile"
          subText="Update your personal information and preferences"
        />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DashboardHeaders
          mainText="My Profile"
          subText="Update your personal information and preferences"
        />
        <div className="flex items-center justify-between">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <Form method="POST">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your basic account and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={!isEditing}
                    className="pl-9 bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="matricNo">Matric No</Label>
                <Input
                  id="matricNo"
                  value={formData.matricNo}
                  disabled
                  onChange={(e) =>
                    handleInputChange("matricNo", e.target.value)
                  }
                  className="bg-muted text-black"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    disabled={!isEditing}
                    className="pl-9"
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => handleInputChange("level", value)}
                  disabled={!isEditing}
                  name="level"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level} Level
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="level" value={formData.level} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hostel">Hostel</Label>
                <Select
                  value={formData.hostel}
                  onValueChange={(value) => handleInputChange("hostel", value)}
                  disabled={!isEditing}
                  name="hostel"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your hostel" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData?.gender === "male"
                      ? MaleHostels.map((hostel) => (
                          <SelectItem key={hostel} value={hostel}>
                            {hostel}
                          </SelectItem>
                        ))
                      : femaleHostels.map((hostel) => (
                          <SelectItem key={hostel} value={hostel}>
                            {hostel}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="hostel" value={formData.hostel} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">Room Number</Label>
                <Input
                  id="roomNumber"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={(e) =>
                    handleInputChange("roomNumber", e.target.value)
                  }
                  disabled={!isEditing}
                  placeholder="e.g., A201"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent/Guardian Information
            </CardTitle>
            <CardDescription>
              Contact details for parent notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guardianName">Parent/Guardian Name</Label>
              <Input
                id="guardianName"
                name="guardianName"
                value={formData.guardianName}
                onChange={(e) =>
                  handleInputChange("guardianName", e.target.value)
                }
                disabled={!isEditing}
                placeholder="Enter parent or guardian name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianPhoneNumber">Parent Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guardianPhoneNumber"
                  name="guardianPhoneNumber"
                  type="tel"
                  value={formData.guardianPhoneNumber}
                  onChange={(e) =>
                    handleInputChange("guardianPhoneNumber", e.target.value)
                  }
                  disabled={!isEditing}
                  className="pl-9"
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="notifyParent"
                  className="flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Parent Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to parent when you check out or check in
                </p>
              </div>
              <Switch
                id="notifyParent"
                checked={formData.notifyParent}
                onCheckedChange={(checked) =>
                  handleInputChange("notifyParent", checked)
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
}
