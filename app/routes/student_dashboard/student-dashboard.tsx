import {
  AlarmClock,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  XCircle,
} from "lucide-react";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";
import { Link, redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import { DashboardHeaders } from "~/components/dashboard";
import DashboardSkeleton from "~/components/dashboard-skeleton";
import NoDataPage from "~/components/global/no-data";
import Loader from "~/components/loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getStatusColor, getStatusIcon } from "~/services/getPassStatusService";
import type { Route } from "./+types/layout";
import { getCards } from "./data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Form } from "react-router";
import { Separator } from "~/components/ui/separator";
import type { PassRequest } from "types";
import { formatDate, formatTime } from "./actions";

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    supabase.auth.signOut();
    return redirect("/login");
  }

  const userId = user.id;

  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("*")
    .eq("id", userId)
    .single();

  if (studentError || !student) {
    return redirect("/login");
  }

  const { data: passes, error: passesError } = await supabase
    .from("pass")
    .select("*")
    .eq("student_id", userId)
    .order("requested_at", { ascending: false })
    .limit(5);

  // console.log("Passes data:", passes);

  if (passesError) {
    toast.error("Failed to load your passes. Please try again.");
    return redirect("/student-dashboard");
  }

  const totalPasses = passes ? passes.length : 0;
  const pendingCount = passes
    ? passes.filter((pass) => pass.status === "pending" || pass.status === "dsa_approved").length
    : 0;
  const approvedCount = passes
    ? passes.filter((pass) => pass.status === "approved").length
    : 0;
  const deniedCount = passes
    ? passes.filter((pass) => pass.status === "denied").length
    : 0;

  return {
    student,
    recentPasses: passes ?? [],
    stats: {
      total: totalPasses,
      pending: pendingCount,
      approved: approvedCount,
      denied: deniedCount,
    },
  };
}

export function HydrateFallback() {
  return <Loader />;
}

type StudentLoaderData = Exclude<
  Awaited<ReturnType<typeof clientLoader>>,
  Response
>;

// TODO: Implement recent pass fetch details when a recent pass is clicked
const StudentDashboard = ({
  loaderData,
}: {
  loaderData?: StudentLoaderData | null;
}) => {
  const cards = getCards(
    loaderData?.stats ?? { total: 0, pending: 0, approved: 0, denied: 0 }
  );
  const recentPasses = loaderData?.recentPasses ?? [];
  const student = loaderData?.student;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PassRequest | null>(
    null
  );

  const handleViewDetails = (request: PassRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <main className="w-full space-y-6">
        <DashboardHeaders
          mainText="Student Dashboard"
          subText={`Welcome back ${student?.firstName ?? ""}! Here's your exit pass overview`}
          buttonText="Apply for Pass"
          buttonLink="/student-dashboard/apply-for-pass"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md font-semibold text-blue-950">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.valueClass}`}>
                  {card.value}
                </div>
                <p className="text-xs text-gray-800">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Passes */}
        <Card className="text-gray-800 bg-gray-50">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-gray-800">
              <CardTitle className="text-blue-950 text-lg font-semibold">
                Recent Requests
              </CardTitle>
              <CardDescription className="text-gray-800">
                Your latest exit pass applications
              </CardDescription>
            </div>
            <Link to="/student-dashboard/my-pass-requests">
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
            <div className="space-y-4 text-gray-800">
              {recentPasses.length < 1 ? (
                <NoDataPage text="No Recent Passes" />
              ) : (
                recentPasses.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 ">
                      {getStatusIcon(request.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {request.type == "long"
                              ? "Long Pass"
                              : "Short Pass"}
                          </p>
                          <Badge
                            variant="outline"
                            className={getStatusColor(request.status)}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm mt-1 ">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.destination}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(request.created_at).toLocaleString(
                              "en-NG",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left sm:text-right">
                        <p className="text-sm">
                          Submitted{" "}
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                        className="gap-2"
                      >
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pt-[40px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pass Request Details
              </DialogTitle>
              <DialogDescription>
                Complete information about your exit pass request
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <p className="font-mono font-medium">
                      {selectedRequest.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex flex-col md:flex-row md:gap-6 items-center justify-center gap-4">
                    {selectedRequest &&
                      selectedRequest.status === "pending" && (
                        <Form
                          method="post"
                          className="pt-4"
                          action="/student-dashboard/my-pass-requests"
                        >
                          <input
                            type="hidden"
                            name="intent"
                            value="delete-pass"
                          />
                          <input
                            type="hidden"
                            name="passId"
                            value={selectedRequest.id}
                          />
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Delete Request
                          </Button>
                        </Form>
                      )}

                    <Badge
                      variant="outline"
                      className={getStatusColor(selectedRequest.status)}
                    >
                      <span className="flex items-center gap-1 p-2 text-md">
                        {getStatusIcon(selectedRequest.status)}
                        {selectedRequest.status.charAt(0).toUpperCase() +
                          selectedRequest.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pass Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pass Type</p>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 mt-1 text-sm"
                      >
                        {selectedRequest.type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Submitted On
                      </p>
                      <p className="font-medium mt-1">
                        {new Date(
                          selectedRequest.created_at
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Travel Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Reason for Exit
                      </p>
                      <p className="font-medium mt-1">
                        {selectedRequest.reason}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Additional Notes
                      </p>
                      <p className="text-sm mt-1">
                        {selectedRequest.additional_notes}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Departure</p>
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">
                          {new Date(
                            `${selectedRequest.departure_date}T${selectedRequest.departure_time}`
                          ).toLocaleString("en-NG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.type == "long" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Return</p>
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">
                            {formatDate(selectedRequest.return_date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(selectedRequest.return_time)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {selectedRequest.status === "pending" ? (
                  // --------------------------
                  // PENDING MESSAGE
                  // --------------------------
                  <p className={getStatusColor(selectedRequest.status)}>
                    Pass has not yet been approved...
                  </p>
                ) : (
                  // --------------------------
                  // TIMELINE STARTS HERE
                  // --------------------------
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Request Timeline
                    </h3>

                    <div className="space-y-3">
                      {/* --------------------------
          IF REJECTED → STOP AND SHOW ONLY THIS
      --------------------------- */}
                      {selectedRequest.rejected_by ||
                      selectedRequest.rejected_at ? (
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>

                          <div>
                            <p className="font-medium text-sm">Rejected by</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedRequest.rejected_by_role}
                            </p>

                            {selectedRequest.rejected_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(
                                  selectedRequest.rejected_at
                                ).toLocaleString()}
                              </p>
                            )}

                            {selectedRequest.rejection_reason && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <p className="text-sm text-red-800">
                                  <strong>Reason:</strong>{" "}
                                  {selectedRequest.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* --------------------------
              DSA APPROVED
          --------------------------- */}
                          {(selectedRequest.dsa_approved_by ||
                            selectedRequest.dsa_approved_at) && (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>

                              <div>
                                <p className="font-medium text-sm">
                                  Approved by DSA
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Your pass request has been approved by the
                                  DSA's office.
                                </p>

                                {selectedRequest.dsa_approved_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(
                                      selectedRequest.dsa_approved_at
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* --------------------------
              CSO APPROVAL OR WAITING
          --------------------------- */}
                          {selectedRequest.cso_approved_by ||
                          selectedRequest.cso_approved_at ? (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>

                              <div>
                                <p className="font-medium text-sm">
                                  Approved by CSO
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  You can now download your pass and leave the
                                  school premises.
                                </p>

                                {selectedRequest.cso_approved_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(
                                      selectedRequest.cso_approved_at
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                <AlarmClock className="h-4 w-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  Pending CSO approval....
                                </p>
                                <p className="text-sm">
                                  Your pass request has not yet been approved by
                                  the CSO's office.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* CHECKED OUT */}
                          {selectedRequest.checked_out_at && (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-purple-600" />
                              </div>

                              <div>
                                <p className="font-medium text-sm">
                                  Checked Out
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    selectedRequest.checked_out_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* CHECKED IN */}
                          {selectedRequest.checked_in_at && (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                              </div>

                              <div>
                                <p className="font-medium text-sm">
                                  Checked In
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    selectedRequest.checked_in_at
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </Suspense>
  );
};

export default StudentDashboard;
