import {
  AlertCircle,
  CalendarIcon,
  FileText,
  Loader2,
  MapPin,
  Phone,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import type { FormData, PassType } from "types";
import { DashboardHeaders } from "~/components/dashboard";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { Route } from "./+types/layout";
import { applyForStudentPass } from "./actions";

const reasonOptions = [
  "Medical Appointment",
  "Family Emergency",
  "Home Visit",
  "Academic Purpose",
  "Job Interview",
  "Personal Work",
  "Shopping/Banking",
  "Sick Leave",
  "Other",
];

export async function clientAction({ request }: Route.ClientActionArgs) {
  let res;
  try {
    let formData = await request.formData();
    console.log(Object.fromEntries(formData));
    res = await applyForStudentPass(formData, request);

    if (!res.error) {
      toast.success("Exit pass request submitted successfully!");
      return redirect("/student-dashboard");
    } else if (res.message == "You must be logged in to apply for a pass.") {
      return redirect("/login");
    } else {
      toast.error(
        res.message || "Failed to submit exit pass request. Please try again."
      );
    }
  } catch (error) {
    toast.error(
      "There was an error submitting your request. Please try again."
    );
    console.error("Error submitting exit pass request:", error);
  }

  return res;
}

export default function ApplyPage({ actionData }: Route.ComponentProps) {
  console.log("This is the action data: ", actionData);
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.formAction === "/student-dashboard/apply-for-pass";

  const [formData, setFormData] = useState<FormData>({
    passType: "short",
    reason: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    returnDate: "",
    returnTime: "",
    emergencyContact: "",
    emergencyPhone: "",
    additionalNotes: "",
    parentNotification: true,
  });

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "passType" && value === "short") {
        newData.returnDate = "";
        newData.returnTime = "";
      }
      return newData;
    });
  };

  const isFormValid = () => {
    const required = [
      formData.reason,
      formData.destination,
      formData.departureDate,
      formData.departureTime,
      formData.emergencyContact,
      formData.emergencyPhone,
    ];

    if (formData.passType === "long") {
      required.push(formData.returnDate, formData.returnTime);
    }

    return required.every((field) => field.trim() !== "");
  };

  return (
    <div className="space-y-6 max-w-2xl text-gray-800">
      <DashboardHeaders
        mainText="Apply for Exit Pass"
        subText="Fill out the form below to request an exit pass"
      />

      <Form method="POST" className="space-y-6">
        {/* Pass Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-950 text-xl">
              <FileText className="h-5 w-5" />
              Pass Type
            </CardTitle>
            <CardDescription className="text-gray-800">
              Select the type of exit pass you need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.passType}
              onValueChange={(value: PassType) =>
                handleInputChange("passType", value)
              }
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              defaultValue="short" // Add this
            >
              <input type="hidden" name="passType" value={formData.passType} />
              <div className="flex items-center space-x-2 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-800">Short Pass</div>
                  <div className="text-sm text-muted-foreground">
                    Same day return (up to 12 hours)
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="long" id="long" />
                <Label htmlFor="long" className="flex-1 cursor-pointer">
                  <div className="font-medium text-gray-800">Long Pass</div>
                  <div className="text-sm text-muted-foreground">
                    Overnight stay (1+ days)
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Pass Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-950 text-xl">
              <MapPin className="h-5 w-5" />
              Pass Details
            </CardTitle>
            <CardDescription className="text-gray-800">
              Provide details about your exit request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-gray-800">
                  Reason for Exit *
                </Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => handleInputChange("reason", value)}
                  name="reason"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-gray-800">
                  Destination *
                </Label>
                <Input
                  id="destination"
                  placeholder="e.g., Home, Hospital, City Center"
                  value={formData.destination}
                  name="destination"
                  onChange={(e) =>
                    handleInputChange("destination", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes" className="text-gray-800">
                Additional Notes
              </Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any additional information or special circumstances..."
                value={formData.additionalNotes}
                onChange={(e) =>
                  handleInputChange("additionalNotes", e.target.value)
                }
                rows={3}
                name="additionalNotes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Date and Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-950 text-xl">
              <CalendarIcon className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription className="text-gray-800">
              When do you plan to leave and return?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departureDate" className="text-gray-800">
                  Departure Date *
                </Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) =>
                    handleInputChange("departureDate", e.target.value)
                  }
                  className="text-gray-800"
                  name="departureDate"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departureTime" className="text-gray-800">
                  Departure Time *
                </Label>
                <Input
                  id="departureTime"
                  name="departureTime"
                  type="time"
                  className="text-gray-800"
                  value={formData.departureTime}
                  onChange={(e) =>
                    handleInputChange("departureTime", e.target.value)
                  }
                />
              </div>
            </div>

            {formData.passType === "long" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="returnDate" className="text-gray-800">
                    Return Date *
                  </Label>
                  <Input
                    id="returnDate"
                    type="date"
                    name="returnDate"
                    className="text-gray-800"
                    value={formData.returnDate}
                    onChange={(e) =>
                      handleInputChange("returnDate", e.target.value)
                    }
                    min={
                      formData.departureDate ||
                      new Date().toISOString().split("T")[0]
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="returnTime" className="text-gray-800">
                    Return Time *
                  </Label>
                  <Input
                    id="returnTime"
                    type="time"
                    name="returnTime"
                    className="text-gray-800"
                    value={formData.returnTime}
                    onChange={(e) =>
                      handleInputChange("returnTime", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-950 text-xl">
              <Phone className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
            <CardDescription className="text-gray-800">
              Contact person in case of emergency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact" className="text-gray-800">
                  Contact Name *
                </Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  placeholder="Full name"
                  className="text-gray-800"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    handleInputChange("emergencyContact", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-gray-800">
                  Phone Number *
                </Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  name="emergencyPhone"
                  className="text-gray-800"
                  placeholder="+234 7048 268704"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    handleInputChange("emergencyPhone", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="parentNotification"
                checked={formData.parentNotification}
                onCheckedChange={(checked) =>
                  handleInputChange("parentNotification", checked as boolean)
                }
                name="parentNotification"
                disabled
              />
              <Label
                htmlFor="parentNotification"
                className="text-sm text-gray-800"
              >
                Send notification to parent/guardian when I leave campus
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> All exit pass requests must be submitted
            at least 24 hours in advance. Emergency requests may be processed
            faster but require additional documentation.
            You can only for a short pass twice a month.<br/>
            You can only apply for a long pass once a month.
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/student-dashboard/apply-for-pass")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}
