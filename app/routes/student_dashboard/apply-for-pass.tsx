import type React from "react";
import { useState } from "react";
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
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Checkbox } from "~/components/ui/checkbox";
import {
  CalendarIcon,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type { FormData, PassType } from "types";
import { useNavigate } from "react-router";
import { DashboardHeaders } from "~/components/dashboard";

const reasonOptions = [
  "Medical Appointment",
  "Family Emergency",
  "Home Visit",
  "Academic Purpose",
  "Job Interview",
  "Personal Work",
  "Shopping/Banking",
  "Other",
];

export default function ApplyPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // In real app, this would be an API call
    console.log("Form submitted:", formData);

    setIsSubmitting(false);
    navigate("/student/requests");
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
    <div className="space-y-6 max-w-2xl">
      <DashboardHeaders
        mainText="Apply for Exit Pass"
        subText="Fill out the form below to request an exit pass"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
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
              className="grid grid-cols-1  md:grid-cols-2 gap-4"
            >
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
                <Label htmlFor="reason" className="text-gray-800">Reason for Exit *</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => handleInputChange("reason", value)}
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
                <Label htmlFor="destination" className="text-gray-800">Destination *</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Home, Hospital, City Center"
                  value={formData.destination}
                  onChange={(e) =>
                    handleInputChange("destination", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes" className="text-gray-800">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any additional information or special circumstances..."
                value={formData.additionalNotes}
                onChange={(e) =>
                  handleInputChange("additionalNotes", e.target.value)
                }
                rows={3}
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
                <Label htmlFor="departureDate" className="text-gray-800">Departure Date *</Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) =>
                    handleInputChange("departureDate", e.target.value)
                  }
                  className="text-gray-800"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departureTime" className="text-gray-800">Departure Time *</Label>
                <Input
                  id="departureTime"
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
                  <Label htmlFor="returnDate" className="text-gray-800" >Return Date *</Label>
                  <Input
                    id="returnDate"
                    type="date"
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
                  <Label htmlFor="returnTime" className="text-gray-800">Return Time *</Label>
                  <Input
                    id="returnTime"
                    type="time"
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
                <Label htmlFor="emergencyContact" className="text-gray-800">Contact Name *</Label>
                <Input
                  id="emergencyContact"
                  placeholder="Full name"
                  className="text-gray-800"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    handleInputChange("emergencyContact", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-gray-800">Phone Number *</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  className="text-gray-800"
                  placeholder="+1 (555) 123-4567"
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
              />
              <Label htmlFor="parentNotification" className="text-sm text-gray-800">
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
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
