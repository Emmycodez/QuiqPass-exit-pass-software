import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  MapPin,
  Search,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import type { PassRequest } from "types";
import { DashboardHeaders } from "~/components/dashboard";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getStatusColor, getStatusIcon } from "~/services/getPassStatusService";
import type { Route } from "./+types/my-pass-requests";
import toast from "react-hot-toast";
import { Form } from "react-router";

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

    // Fetch student's pass requests with proper column name
    const { data: passes, error: passError } = await supabase
      .from("pass")
      .select("*")
      .eq("student_id", user.id)
      .order("requested_at", { ascending: false });

    if (passError) {
      console.error("Error fetching passes:", passError);
      return {
        passes: [],
        error: "Failed to load pass requests",
      };
    }

    return {
      passes: passes || [],
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error in loader:", error);
    return {
      passes: [],
      error: "An unexpected error occurred",
    };
  }
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const formData = await request.formData();
    const intent = formData.get("intent");

    // Safety check
    if (intent !== "delete-pass") return null;

    const passId = formData.get("passId") as string;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      toast.error("You must be logged in to delete a pass");
      return { error: "You must be logged in." };
    }

    // Delete only if the pass belongs to the user

    async function deleteRequest(userId: string, passId: string) {
      const { error: deleteError } = await supabase
        .from("pass")
        .delete()
        .eq("id", passId)
        .eq("student_id", userId);

        if(deleteError) {
          return deleteError.message;
        }
    }

    toast.promise(deleteRequest(user.id, passId), {
      loading: "Deleting Request....",
      success: "Request Deleted Successfully",
      error: `Error Deleting Request`
    });

    // toast.success("Exit pass has beeen successfully deleted");
    return { success: true };
  } catch (error) {
    toast.error(`Delete pass error: ${error}`);
    console.error("Delete pass error:", error);
    return { error: "Failed to delete pass request." };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

export default function RequestsPage({ loaderData }: Route.ComponentProps) {
  const { passes, error } = loaderData;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PassRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter requests based on status and search query
  const filteredRequests = passes.filter((pass) => {
    const matchesStatus =
      statusFilter === "all" || pass.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      pass.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Helper function to format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to format time
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";
    return timeString.slice(0, 5); // Convert "HH:MM:SS" to "HH:MM"
  };

  const handleViewDetails = (request: PassRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="My Pass Requests"
        subText="View and manage your exit pass requests"
      />

      {/* Display error if any */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters and search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Requests</CardTitle>
          <CardDescription>
            Search and filter your pass requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by destination, ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests table */}
      <Card className="font-semibold">
        <CardHeader>
          <CardTitle>All Requests ({filteredRequests.length})</CardTitle>
          <CardDescription>
            Complete history of your exit pass applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-800"
                    >
                      {passes.length === 0
                        ? "You haven't submitted any pass requests yet"
                        : "No requests found matching your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((pass) => (
                    <TableRow key={pass.id}>
                      <TableCell className="font-medium">
                        <span className="text-xs font-mono">
                          {pass.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-md"
                        >
                          {pass.type === "short" ? "Short Pass" : "Long Pass"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="max-w-[150px] truncate">
                            {pass.destination || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div>{formatDate(pass.departure_date)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(pass.departure_time)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <div>{formatDate(pass.return_date)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(pass.return_time)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(pass.status)}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(pass.status)}
                            {pass.status.charAt(0).toUpperCase() +
                              pass.status.slice(1)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(pass.requested_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="text-md"
                          onClick={() => handleViewDetails(pass)}
                        >
                          View Details
                          <ArrowRight />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pt-[20px]">
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

                {selectedRequest && selectedRequest.status === "pending" && (
                  <Form
                    method="post"
                    className="pt-4 flex flex-col items-center justify-center"
                    action="/student-dashboard/my-pass-requests"
                  >
                    <input type="hidden" name="intent" value="delete-pass" />
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
                  <span className="flex items-center gap-1">
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status.charAt(0).toUpperCase() +
                      selectedRequest.status.slice(1)}
                  </span>
                </Badge>
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
                      {new Date(selectedRequest.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
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
                    <p className="font-medium mt-1">{selectedRequest.reason}</p>
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

              {selectedRequest.status == "pending" ? (
                <p className={getStatusColor(selectedRequest.status)}>
                  Pass has not yet been approved...
                </p>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Request Timeline
                  </h3>
                  <div className="space-y-3">
                    {selectedRequest.approved_by && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Approved by</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedRequest.approved_by}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedRequest.approved_at &&
                              new Date(
                                selectedRequest.approved_at
                              ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRequest.denied_by && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Denied by</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedRequest.denied_by}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedRequest.denied_at &&
                              new Date(
                                selectedRequest.denied_at
                              ).toLocaleString()}
                          </p>
                          {selectedRequest.denial_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <p className="text-sm text-red-800">
                                <strong>Reason:</strong>{" "}
                                {selectedRequest.denial_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedRequest.checked_out_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Checked Out</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedRequest.checked_out_at &&
                              new Date(
                                selectedRequest.checked_out_at
                              ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedRequest.checked_in_at && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Checked In</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedRequest.checked_in_at &&
                              new Date(
                                selectedRequest.checked_in_at
                              ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
