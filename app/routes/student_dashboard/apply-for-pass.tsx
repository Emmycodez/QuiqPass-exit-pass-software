import {
  AlertCircle,
  CalendarIcon,
  FileText,
  Loader2,
  MapPin,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import type { FormData, PassType } from "types";
import { DashboardHeaders } from "~/components/dashboard";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import { supabase } from "supabase/supabase-client";

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

// Type for pass limits
interface PassLimits {
  shortPassesRemaining: number;
  longPassesRemaining: number;
  hasSpecialPrivilege: boolean;
  loading: boolean;
}

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

  const [passLimits, setPassLimits] = useState<PassLimits>({
    shortPassesRemaining: 2,
    longPassesRemaining: 1,
    hasSpecialPrivilege: false,
    loading: true,
  });

  // Fetch pass limits on component mount
  useEffect(() => {
    async function fetchPassLimits() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get current month-year
        const now = new Date();
        const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Check if student has special privilege
        const { data: student } = await supabase
          .from('student')
          .select('has_special_privilege')
          .eq('id', user.id)
          .single();

        if (student?.has_special_privilege) {
          setPassLimits({
            shortPassesRemaining: Infinity,
            longPassesRemaining: Infinity,
            hasSpecialPrivilege: true,
            loading: false,
          });
          return;
        }

        // Get pass limit tracking for current month
        const { data: tracking } = await supabase
          .from('pass_limit_tracking')
          .select('short_pass_count, long_pass_count')
          .eq('student_id', user.id)
          .eq('month_year', monthYear)
          .maybeSingle();

        const shortCount = tracking?.short_pass_count || 0;
        const longCount = tracking?.long_pass_count || 0;

        setPassLimits({
          shortPassesRemaining: Math.max(0, 2 - shortCount),
          longPassesRemaining: Math.max(0, 1 - longCount),
          hasSpecialPrivilege: false,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching pass limits:', error);
        setPassLimits(prev => ({ ...prev, loading: false }));
      }
    }

    fetchPassLimits();
  }, []);

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

  // Check if selected pass type is available
  const canApplyForPassType = () => {
    if (passLimits.hasSpecialPrivilege) return true;
    
    if (formData.passType === "short") {
      return passLimits.shortPassesRemaining > 0;
    } else {
      return passLimits.longPassesRemaining > 0;
    }
  };

  // Get warning message if limit reached
  const getLimitWarning = () => {
    if (passLimits.hasSpecialPrivilege) return null;
    
    if (formData.passType === "short" && passLimits.shortPassesRemaining === 0) {
      return "You have used all 2 short passes for this month. Please select a long pass or wait until next month.";
    }
    
    if (formData.passType === "long" && passLimits.longPassesRemaining === 0) {
      return "You have used your 1 long pass for this month. Please select a short pass or wait until next month.";
    }
    
    return null;
  };

  return (
    <div className="space-y-6 max-w-2xl text-gray-800">
      <DashboardHeaders
        mainText="Apply for Exit Pass"
        subText="Fill out the form below to request an exit pass"
      />

      {/* Pass Limits Display */}
      {!passLimits.loading && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {passLimits.hasSpecialPrivilege 
                    ? "Special Privilege Active" 
                    : "Monthly Pass Limits"}
                </h3>
                {passLimits.hasSpecialPrivilege ? (
                  <p className="text-sm text-blue-700">
                    You have unlimited passes this month due to special privilege status.
                  </p>
                ) : (
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>
                      <strong>Short Passes:</strong> {passLimits.shortPassesRemaining} of 2 remaining
                    </p>
                    <p>
                      <strong>Long Passes:</strong> {passLimits.longPassesRemaining} of 1 remaining
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limit Warning Alert */}
      {getLimitWarning() && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pass Limit Reached</AlertTitle>
          <AlertDescription>{getLimitWarning()}</AlertDescription>
        </Alert>
      )}

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
              defaultValue="short"
              disabled={passLimits.loading}
            >
              <input type="hidden" name="passType" value={formData.passType} />
              
              {/* Short Pass Option */}
              <div className={`flex items-center space-x-2 border rounded-lg p-4 transition-colors ${
                passLimits.shortPassesRemaining === 0 && !passLimits.hasSpecialPrivilege
                  ? 'border-gray-300 bg-gray-50 opacity-50'
                  : 'border-border hover:bg-muted/50'
              }`}>
                <RadioGroupItem 
                  value="short" 
                  id="short"
                  disabled={passLimits.shortPassesRemaining === 0 && !passLimits.hasSpecialPrivilege}
                />
                <Label 
                  htmlFor="short" 
                  className={`flex-1 ${
                    passLimits.shortPassesRemaining === 0 && !passLimits.hasSpecialPrivilege
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <div className="font-medium text-gray-800">
                    Short Pass
                    {!passLimits.hasSpecialPrivilege && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({passLimits.shortPassesRemaining} left)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Same day return (up to 12 hours)
                  </div>
                </Label>
              </div>

              {/* Long Pass Option */}
              <div className={`flex items-center space-x-2 border rounded-lg p-4 transition-colors ${
                passLimits.longPassesRemaining === 0 && !passLimits.hasSpecialPrivilege
                  ? 'border-gray-300 bg-gray-50 opacity-50'
                  : 'border-border hover:bg-muted/50'
              }`}>
                <RadioGroupItem 
                  value="long" 
                  id="long"
                  disabled={passLimits.longPassesRemaining === 0 && !passLimits.hasSpecialPrivilege}
                />
                <Label 
                  htmlFor="long" 
                  className={`flex-1 ${
                    passLimits.longPassesRemaining === 0 && !passLimits.hasSpecialPrivilege
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <div className="font-medium text-gray-800">
                    Long Pass
                    {!passLimits.hasSpecialPrivilege && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({passLimits.longPassesRemaining} left)
                      </span>
                    )}
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/student-dashboard")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting || !canApplyForPassType() || passLimits.loading}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}