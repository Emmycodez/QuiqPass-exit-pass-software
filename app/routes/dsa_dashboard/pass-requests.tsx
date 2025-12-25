import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  MapPin,
  Search,
  X,
  XCircle,
  Calendar,
  AlertCircle,
  AlarmClock,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Form, redirect, useNavigate, useSearchParams } from "react-router";
import { supabase } from "supabase/supabase-client";
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
import { Textarea } from "~/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getStatusColor, getStatusIcon } from "~/services/getPassStatusService";
import type { Route } from "./+types/pass-requests";
import { useRevalidator } from "react-router";

// Client Loader - Paginated, filtered pass requests
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    // -------------------------
    // Auth check
    // -------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login");
    }

    // -------------------------
    // Role check (DSA only)
    // -------------------------
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (staffError || !staff || staff.role !== "DSA") {
      toast.error("Unauthorized access");
      throw redirect("/login");
    }

    // -------------------------
    // URL params
    // -------------------------
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const status = url.searchParams.get("status") ?? "all";
    const search = url.searchParams.get("search") ?? "";

    const pageSize = 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // -------------------------
    // Base query (display query)
    // -------------------------
    let query = supabase.from("pass").select(
      `
        id,
        status,
        type,
        destination,
        departure_date,
        requested_at,
        student:student_id (
          first_name,
          last_name,
          matric_no,
          department,
          hostel:hostel_id ( name )
        )
      `,
      { count: "exact" }
    );

    // -------------------------
    // Status filter
    // -------------------------
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // -------------------------
    // Search filter (via VIEW)
    // -------------------------
    if (search) {
      const searchTerm = `%${search}%`;

      const { data: searchRows, error: searchError } = await supabase
        .from("pass_search_view")
        .select("id")
        .or(
          `destination.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},matric_no.ilike.${searchTerm},department.ilike.${searchTerm}`
        );

      if (searchError) {
        console.error("Search error:", searchError);
        return {
          passes: [],
          totalCount: 0,
          currentPage: page,
          pageSize,
          staffId: user.id,
          error: "Search failed",
        };
      }

      const matchingIds = searchRows.map((row) => row.id);

      // No matches → empty result set
      if (matchingIds.length === 0) {
        return {
          passes: [],
          totalCount: 0,
          currentPage: page,
          pageSize,
          staffId: user.id,
          error: null,
        };
      }

      query = query.in("id", matchingIds);
    }

    // -------------------------
    // Ordering + pagination
    // -------------------------
    const {
      data: passes,
      error: passError,
      count,
    } = await query.order("requested_at", { ascending: false }).range(from, to);

    if (passError) {
      console.error("Error fetching passes:", passError);
      return {
        passes: [],
        totalCount: 0,
        currentPage: page,
        pageSize,
        staffId: user.id,
        error: "Failed to load pass requests",
      };
    }

    // -------------------------
    // Success
    // -------------------------
    return {
      passes: passes ?? [],
      totalCount: count ?? 0,
      currentPage: page,
      pageSize,
      staffId: user.id,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error in loader:", error);
    return {
      passes: [],
      totalCount: 0,
      currentPage: 1,
      pageSize: 25,
      staffId: null,
      error: "An unexpected error occurred",
    };
  }
}

// Client Action - Handle approve/reject actions
export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;
    const passId = formData.get("passId") as string;
    const staffId = formData.get("staffId") as string;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      toast.error("You must be logged in");
      return { error: "Unauthorized" };
    }

    if (intent === "approve") {
      const { error: updateError } = await supabase
        .from("pass")
        .update({
          status: "dsa_approved",
          dsa_approved_by: staffId,
          dsa_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", passId);

      if (updateError) {
        toast.error("Failed to approve pass");
        return { error: updateError.message };
      }

      toast.success("Pass approved and forwarded to CSO");
      return { success: true };
    }

    if (intent === "reject") {
      const rejectionReason = formData.get("rejectionReason") as string;

      if (!rejectionReason || rejectionReason.trim() === "") {
        toast.error("Please provide a rejection reason");
        return { error: "Rejection reason required" };
      }

      const { error: updateError } = await supabase
        .from("pass")
        .update({
          status: "rejected",
          rejected_by: staffId,
          rejected_at: new Date().toISOString(),
          rejected_by_role: "DSA",
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", passId);

      if (updateError) {
        toast.error("Failed to reject pass");
        return { error: updateError.message };
      }

      toast.success("Pass rejected successfully");
      return { success: true };
    }

    return null;
  } catch (error) {
    console.error("Action error:", error);
    toast.error("An error occurred");
    return { error: "Failed to process request" };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

// Helper function to get readable status
const getReadableStatus = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending";
    case "dsa_approved":
      return "Forwarded to CSO";
    case "cso_approved":
      return "CSO Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return "N/A";
  return timeStr;
};

export default function PassRequests({ loaderData }: Route.ComponentProps) {
  const { passes, totalCount, currentPage, pageSize, staffId, error } =
    loaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState(
    searchParams.get("search") ?? ""
  );
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [fullPassDetails, setFullPassDetails] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { revalidate, state } = useRevalidator();

  const statusFilter = searchParams.get("status") ?? "all";
  const totalPages = Math.ceil(totalCount / pageSize);

  // Update URL with filters
  const updateFilters = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to page 1 when filtering
    if (key !== "page") {
      newParams.set("page", "1");
    }
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSearch = () => {
    updateFilters("search", localSearch);
  };

  const handlePageChange = (newPage: number) => {
    updateFilters("page", newPage.toString());
  };

  // Fetch full pass details when viewing
  const handleViewDetails = async (request: any) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
    setIsLoadingDetails(true);

    try {
      const { data, error } = await supabase
        .from("pass")
        .select(
          `
          *,
          student:student_id (
            first_name,
            last_name,
            matric_no,
            department,
            phone_number,
            hostel:hostel_id ( name )
          )
        `
        )
        .eq("id", request.id)
        .single();

      if (error) {
        toast.error("Failed to load full details");
        console.error(error);
      } else {
        setFullPassDetails(data);
      }
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <DashboardHeaders
          mainText="Pass Requests"
          subText="Review, approve or deny student exit pass requests"
        />

        <Button
          className="gap-2 w-full sm:w-auto"
          onClick={() => revalidate()}
          disabled={state === "loading"}
        >
          <RefreshCcw
            className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Requests</CardTitle>
          <CardDescription>
            Search and filter student pass requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, matric number, department..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
            <div className="sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => updateFilters("status", value)}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dsa_approved">Forwarded to CSO</SelectItem>
                  <SelectItem value="cso_approved">CSO Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pass Requests ({totalCount} total)</CardTitle>
          <CardDescription>
            Showing {passes.length} of {totalCount} requests - Page{" "}
            {currentPage} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  passes.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <span className="text-xs font-mono">
                          {request.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.student?.first_name}{" "}
                            {request.student?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.student?.matric_no}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.student?.hostel?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/10">
                          {request.type === "short" ? "Short" : "Long"}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.destination || "N/A"}</TableCell>
                      <TableCell>
                        {formatDate(request.departure_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          {getReadableStatus(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Form method="post">
                                <input
                                  type="hidden"
                                  name="intent"
                                  value="approve"
                                />
                                <input
                                  type="hidden"
                                  name="passId"
                                  value={request.id}
                                />
                                <input
                                  type="hidden"
                                  name="staffId"
                                  value={staffId || ""}
                                />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </Form>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(request)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pass Request Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the exit pass request
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : fullPassDetails ? (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Request ID</p>
                  <p className="font-mono font-medium">
                    {fullPassDetails.id.slice(0, 12)}...
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(fullPassDetails.status)}
                >
                  <span className="flex items-center gap-1 p-2">
                    {getStatusIcon(fullPassDetails.status)}
                    {getReadableStatus(fullPassDetails.status)}
                  </span>
                </Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {fullPassDetails.student?.first_name}{" "}
                      {fullPassDetails.student?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Matric Number
                    </p>
                    <p className="font-medium">
                      {fullPassDetails.student?.matric_no}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">
                      {fullPassDetails.student?.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hostel</p>
                    <p className="font-medium">
                      {fullPassDetails.student?.hostel?.name}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pass Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="mt-1">
                      {fullPassDetails.type === "short"
                        ? "Short Pass"
                        : "Long Pass"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium">{fullPassDetails.destination}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{fullPassDetails.reason}</p>
                  </div>
                  {fullPassDetails.additional_notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        Additional Notes
                      </p>
                      <p className="text-sm">
                        {fullPassDetails.additional_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <p className="font-medium">
                      {formatDate(fullPassDetails.departure_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(fullPassDetails.departure_time)}
                    </p>
                  </div>
                  {fullPassDetails.type === "long" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Return</p>
                      <p className="font-medium">
                        {formatDate(fullPassDetails.return_date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(fullPassDetails.return_time)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {fullPassDetails.status !== "pending" && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Request Timeline
                    </h3>

                    <div className="space-y-3">
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
                                  The pass request has been approved by the
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
                                  The pass request has been approved by the
                                  CSO's office and can be downloaded by the
                                  student
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
                                  The pass request has not yet been approved by
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
                </>
              )}

              {fullPassDetails.status === "pending" && (
                <>
                  <Separator />
                  <div className="flex gap-3">
                    <Form method="post" className="flex-1">
                      <input type="hidden" name="intent" value="approve" />
                      <input
                        type="hidden"
                        name="passId"
                        value={fullPassDetails.id}
                      />
                      <input
                        type="hidden"
                        name="staffId"
                        value={staffId || ""}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Pass
                      </Button>
                    </Form>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setIsDialogOpen(false);
                        handleReject(fullPassDetails);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Pass
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load details
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Pass Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this pass request
            </DialogDescription>
          </DialogHeader>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="reject" />
            <input type="hidden" name="passId" value={selectedRequest?.id} />
            <input type="hidden" name="staffId" value={staffId || ""} />
            <Textarea
              name="rejectionReason"
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
              rows={4}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setRejectionReason("");
                }}
              >
                Reject Pass
              </Button>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
