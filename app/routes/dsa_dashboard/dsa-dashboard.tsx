import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Phone,
  TrendingUp,
  User,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link, redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/dsa-dashboard";
import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// TODO: Confirm if pass limit tracking auto updates

export interface RawPassRequest {
  id: string;
  student_id: string;
  type: string;
  destination: string;
  reason: string;
  status: string;
  requested_at: string;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  emergency_contact_name: string;
  emergency_contact_phone_number: string;
  additional_notes: string | null;
  student: {
    has_special_privilege: boolean;
    first_name: string;
    last_name: string;
    matric_no: string;
    hostel: { name: string } | null;
  } | null;
}

interface PassRequest {
  id: string;
  student_id: string;
  type: string;
  destination: string;
  reason: string;
  status: string;
  requested_at: string;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  emergency_contact_name: string;
  emergency_contact_phone_number: string;
  additional_notes: string | null;
  student: {
    has_special_privilege: boolean;
    first_name: string;
    last_name: string;
    matric_no: string;
    hostel: {
      name: string;
    } | null;
  };
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/staff-login");
    }

    // Verify user is DSA
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (staffError || staff?.role !== "DSA") {
      console.log("Unauthorized access attempt to DSA dashboard");
      throw redirect("/login");
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get current month date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // Fetch pending passes (awaiting DSA approval)
    const { data: pendingPasses, error: pendingError } = await supabase
      .from("pass")
      .select("id")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    if (pendingError) {
      toast.error("System failed to fetch pending passes");
      console.log("Error fetching pending passes:", pendingError);
      return;
    }
    // Fetch DSA approved passes
    const { data: dsaApprovedToday, error: dsaApprovedError } = await supabase
      .from("pass")
      .select("id")
      .eq("status", "dsa_approved")
      .gte("dsa_approved_at", today.toISOString())
      .lt("dsa_approved_at", tomorrow.toISOString());

    if (dsaApprovedError) {
      toast.error("System failed to fetch DSA approved passes");
      console.log("Error fetching DSA approved passes:", dsaApprovedError);
      return;
    }

    // Fetch passes finally approved by CSO today (Status: cso_approved)
    const { data: csoApprovedToday, error: csoApprovedError } = await supabase
      .from("pass")
      .select("id")
      .eq("status", "cso_approved")
      .gte("cso_approved_at", today.toISOString())
      .lt("cso_approved_at", tomorrow.toISOString());

    if (csoApprovedError) {
      toast.error("System failed to fetch CSO approved passes");
      console.log("Error fetching CSO approved passes:", csoApprovedError);
      return;
    }
    // Fetch passes denied by CSO today
    const { data: csoDeniedToday, error: csoDeniedError } = await supabase
      .from("pass")
      .select("id")
      .eq("status", "rejected")
      .eq("rejected_by_role", "CSO")
      .gte("rejected_at", today.toISOString())
      .lt("rejected_at", tomorrow.toISOString());

    if (csoDeniedError) {
      toast.error("System failed to fetch CSO denied passes");
      console.log("Error fetching CSO denied passes:", csoDeniedError);
      return;
    }

    // Fetch passes denied today
    const { data: deniedToday, error: deniedError } = await supabase
      .from("pass")
      .select("id")
      .eq("status", "rejected")
      .eq("rejected_by_role", "DSA")
      .gte("rejected_at", today.toISOString())
      .lt("rejected_at", tomorrow.toISOString());

    if (deniedError) {
      toast.error("System failed to fetch denied passes");
      console.log("Error fetching denied passes:", deniedError);
      return;
    }

    // Fetch total requests this month
    const { data: totalRequests, error: totalError } = await supabase
      .from("pass")
      .select("id")
      .gte("requested_at", monthStart.toISOString())
      .lte("requested_at", monthEnd.toISOString());

    if (totalError) {
      toast.error("System failed to fetch total requests");
      console.log("Error fetching total requests:", totalError);
      return;
    }

    // Fetch recent pending requests with student details
    const { data: recentRequests, error: recentError } = await supabase
      .from("pass")
      .select(
        `
        id,
        student_id,
        type,
        destination,
        reason,
        status,
        requested_at,
        departure_date,
        departure_time,
        return_date,
        return_time,
        emergency_contact_name,
        emergency_contact_phone_number,
        additional_notes,
        student:student_id (
          first_name,
          last_name,
          matric_no,
          has_special_privilege,
          hostel:hostel_id (
            name
          )
        )
      `
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(10);

    if (recentError) {
      toast.error("System failed to fetch recent requests");
      console.log("Error fetching recent requests:", recentError);
      return;
    }

    // Transform the data from RawPassRequest to PassRequest
    const transformedRequests: PassRequest[] = (
      (recentRequests as unknown as RawPassRequest[]) || []
    ).map((req) => ({
      id: req.id,
      student_id: req.student_id,
      type: req.type,
      destination: req.destination,
      reason: req.reason,
      status: req.status,
      requested_at: req.requested_at,
      departure_date: req.departure_date,
      departure_time: req.departure_time,
      return_date: req.return_date,
      return_time: req.return_time,
      emergency_contact_name: req.emergency_contact_name,
      emergency_contact_phone_number: req.emergency_contact_phone_number,
      additional_notes: req.additional_notes,
      student: {
        has_special_privilege: req.student?.has_special_privilege || false,
        first_name: req.student?.first_name || "",
        last_name: req.student?.last_name || "",
        matric_no: req.student?.matric_no || "",
        hostel: req.student?.hostel || null,
      },
    }));

    const urgentReasons = [
      "Medical Emergency",
      "Family Emergency",
      "Medical Appointment",
    ];

    const sortedRequests = transformedRequests.sort((a, b) => {
      // 1. Special privilege
      if (a.student.has_special_privilege && !b.student.has_special_privilege)
        return -1;
      if (!a.student.has_special_privilege && b.student.has_special_privilege)
        return 1;

      // 2. Urgency
      const aUrgent = urgentReasons.some((r) =>
        a.reason.toLowerCase().includes(r.toLowerCase())
      );
      const bUrgent = urgentReasons.some((r) =>
        b.reason.toLowerCase().includes(r.toLowerCase())
      );

      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      // 3. Newest first by requested_at
      return (
        new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
      );
    });

    return {
      stats: {
        pendingApproval: pendingPasses?.length || 0,
        dsaApprovedToday: dsaApprovedToday?.length || 0,
        csoApprovedToday: csoApprovedToday?.length || 0,
        csoDeniedToday: csoDeniedToday?.length || 0,
        deniedToday: deniedToday?.length || 0,
        totalRequests: totalRequests?.length || 0,
      },
      recentRequests: sortedRequests,
    };
  } catch (error: any) {
    // If it's a redirect, throw it
    if (error?.status === 302 || error instanceof Response) {
      throw error;
    }
    toast.error("Error Loading DSA dashboard data");
    console.error("Error loading DSA dashboard:", error);
    return {
      stats: {
        pendingApproval: 0,
        dsaApprovedToday: 0,
        csoApprovedToday: 0,
        csoDeniedToday: 0,
        deniedToday: 0,
        totalRequests: 0,
      },
      recentRequests: [],
      error: "Failed to load dashboard data. Please refresh the page.",
    };
  }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const passId = formData.get("passId") as string;
  const comments = formData.get("comments") as string;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to perform this action.");
      return { error: "Unauthorized" };
    }

    // Verify user is DSA
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (staffError || staff?.role !== "DSA") {
      console.log("Unauthorized access attempt to DSA dashboard");
      throw redirect("/login");
    }

    if (intent === "approve") {
      const { error: approveError } = await supabase
        .from("pass")
        .update({
          status: "dsa_approved",
          dsa_approved_by: user.id,
          dsa_approved_at: new Date().toISOString(),
          dsa_comments: comments || null,
        })
        .eq("id", passId)
        .eq("status", "dsa_approved");

      if (approveError) {
        toast.error("System failed to approve pass request");
        console.error("Error approving pass request:", approveError);
        return { error: "Failed to approve pass request" };
      }

      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "pass_dsa_approved",
        entity_type: "pass",
        entity_id: passId,
      });

      toast.success("Pass approved Succesfully!");
      return { success: true, message: "Pass approved successfully" };
    } else if (intent === "deny") {
      const { error: denyError } = await supabase
        .from("pass")
        .update({
          status: "rejected",
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejected_by_role: "DSA",
          rejection_reason: comments || null,
        })
        .eq("id", passId)
        .eq("status", "rejected");

      if (denyError) {
        toast.error("System failed to deny pass request");
        console.error("Error denying pass request:", denyError);
        return { error: "Failed to deny pass request" };
      }
      toast.success("Pass denied Successfully");
      return redirect("/dsa-dashboard")
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "pass_rejected",
        entity_type: "pass",
        entity_id: passId,
      });
    }
  } catch (error) {
    toast.error("Error Processing Pass");
    console.error("Error Processing pass: ", error);
    return {
      error: "Failed to process pass request",
    };
  } 
}

export default function DSADashboard({ loaderData }: Route.ComponentProps) {
  const { stats, recentRequests, error } = loaderData || {
    stats: {
      pendingApproval: 0,
      dsaApprovedToday: 0,
      csoApprovedToday: 0,
      csoDeniedToday: 0,
      deniedToday: 0,
      totalRequests: 0,
    },
    recentRequests: [],
  };
  const [selectedPass, setSelectedPass] = useState<PassRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState("");
  const [actionType, setActionType] = useState<"approve" | "deny" | null>(null);
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      toast.success(fetcher.data.message);
      setShowModal(false);
      setComments("");
      setActionType(null);
      setSelectedPass(null);
    } else if (fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.data]);

  const handleViewDetails = (request: PassRequest) => {
    setSelectedPass(request);
    setShowModal(true);
    setComments("");
    setActionType(null);
  };

  const handleAction = (type: "approve" | "deny") => {
    if (!selectedPass) return;

    const formData = new FormData();
    formData.append("intent", type);
    formData.append("passId", selectedPass.id);
    formData.append("comments", comments);

    fetcher.submit(formData, { method: "post" });
  };

  const handleQuickApprove = (request: PassRequest) => {
    setSelectedPass(request);
    const formData = new FormData();
    formData.append("intent", "approve");
    formData.append("passId", request.id);
    formData.append("comments", "");
    fetcher.submit(formData, { method: "post" });
  };

  // Helper function to determine priority
  const getPriority = (request: PassRequest) => {
    const urgentReasons = [
      "Medical Emergency",
      "Family Emergency",
      "Medical Appointment",
    ];
    return urgentReasons.some((reason) =>
      request.reason.toLowerCase().includes(reason.toLowerCase())
    )
      ? "urgent"
      : "normal";
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dean of Student Affairs Dashboard
            </h1>
            <p className="text-muted-foreground">
              Review and approve student exit pass requests
            </p>
          </div>
          <Link to="/dsa-dashboard/pass-requests">
            <Button className="gap-2 w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              Review Requests
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingApproval}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting your decision
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                DSA Approved Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.dsaApprovedToday}
              </div>
              <p className="text-xs text-muted-foreground">Forwarded to CSO</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                CSO Approved Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.csoApprovedToday}
              </div>
              <p className="text-xs text-muted-foreground">
                Final Approval Made
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Denied Today
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.deniedToday}
              </div>
              <p className="text-xs text-muted-foreground">Rejected by you</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Denied By CSO
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.csoDeniedToday}
              </div>
              <p className="text-xs text-muted-foreground">Rejected by CSO</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.totalRequests}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Requests</CardTitle>
              <CardDescription>
                {stats.pendingApproval > 0
                  ? `${stats.pendingApproval} requests awaiting your approval`
                  : "No pending requests"}
              </CardDescription>
            </div>
            <Link to="/dsa-dashboard/pass-requests">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No pending requests at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-gray-900">
                {recentRequests.map((request) => {
                  const priority = getPriority(request);
                  const studentName = `${request.student.first_name} ${request.student.last_name}`;
                  const initials = studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("");

                  return (
                    <div
                      key={request.id}
                      className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4 text-gray-900"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-gray-900">
                            {initials}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium ">{studentName}</p>
                            <Badge variant="outline" className="text-xs">
                              {request.student.matric_no}
                            </Badge>
                            {priority === "urgent" && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {request.student.has_special_privilege && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                              >
                                Special Privilege
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-900 mt-1">
                            <span>{request.student.hostel?.name || "N/A"}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="capitalize">
                              {request.type} Pass
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">
                              {request.destination}
                            </span>
                          </div>
                          <p className="text-xs text-gray-900 mt-1">
                            {formatTimeAgo(request.requested_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full lg:w-auto text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleViewDetails(request)}
                        >
                          View Details
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 lg:flex-initial text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleQuickApprove(request)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting && selectedPass?.id === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 lg:flex-initial text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedPass(request);
                            setShowModal(true);
                            setActionType("deny");
                          }}
                          disabled={isSubmitting}
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pass Request Details</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Review the complete details before making a decision
            </DialogDescription>
          </DialogHeader>

          {selectedPass && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedPass.student.first_name}{" "}
                      {selectedPass.student.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Matric No</p>
                    <p className="font-medium">
                      {selectedPass.student.matric_no}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hostel</p>
                    <p className="font-medium">
                      {selectedPass.student.hostel?.name || "N/A"}
                    </p>
                  </div>
                  {selectedPass.student.has_special_privilege && (
                    <div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        Special Privilege
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Pass Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pass Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pass Type</p>
                      <p className="font-medium capitalize">
                        {selectedPass.type} Pass
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Destination
                      </p>
                      <p className="font-medium">{selectedPass.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p className="font-medium">{selectedPass.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departure</p>
                      <p className="font-medium">
                        {new Date(
                          selectedPass.departure_date
                        ).toLocaleDateString()}{" "}
                        at {selectedPass.departure_time}
                      </p>
                    </div>
                  </div>
                  {selectedPass.type === "long" && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Return</p>
                        <p className="font-medium">
                          {selectedPass.return_date
                            ? new Date(
                                selectedPass.return_date
                              ).toLocaleDateString()
                            : "N/A"}{" "}
                          at {selectedPass.return_time || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedPass.emergency_contact_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {selectedPass.emergency_contact_phone_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedPass.additional_notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Additional Notes</h3>
                  <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                    {selectedPass.additional_notes}
                  </p>
                </div>
              )}

              {/* DSA Comments */}
              {actionType === "deny" && (
                <div className="space-y-2">
                  <Label htmlFor="comments">
                    Reason for Denial <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="comments"
                    placeholder="Please provide a reason for denying this request..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              {actionType !== "deny" && (
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any comments or notes..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>

                {/* Deny Button */}
                <Button
                  variant="destructive"
                  disabled={
                    isSubmitting ||
                    (actionType === "deny" && comments.trim().length === 0)
                  }
                  onClick={() => handleAction("deny")}
                  className="flex items-center gap-2"
                >
                  {isSubmitting && actionType === "deny" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Deny"
                  )}
                </Button>

                {/* Approve Button */}
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleAction("approve")}
                  className="flex items-center gap-2"
                >
                  {isSubmitting && actionType === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Approve"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
