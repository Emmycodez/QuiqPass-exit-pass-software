import { useState } from "react";
import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import toast from "react-hot-toast";
import Loader from "~/components/loader";
import { DashboardHeaders } from "~/components/dashboard";
import { Badge } from "~/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Search, Eye, Mail, Phone, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { Route } from "./+types/students";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  matric_no: string | null;
  department: string | null;
  guardian_name: string | null;
  guardian_phone_number: string | null;
  level: number | null;
  hostel_id: string | null;
  room_number: string | null;
  bed_number: string | null;
  hostel: { name: string; gender: string }[] | { name: string; gender: string } | null;
  totalPasses: number;
  approvedPasses: number;
  deniedPasses: number;
  activePasses: number;
};

function getHostelName(
  hostel: { name: string; gender: string }[] | { name: string; gender: string } | null
): string | null {
  if (!hostel) return null;
  if (Array.isArray(hostel)) return hostel[0]?.name ?? null;
  return hostel.name;
}

function buildStudentPassStats(
  passes: { student_id: string; status: string }[]
) {
  const map = new Map<
    string,
    {
      totalPasses: number;
      approvedPasses: number;
      deniedPasses: number;
      activePasses: number;
    }
  >();

  passes.forEach(({ student_id, status }) => {
    if (!map.has(student_id)) {
      map.set(student_id, {
        totalPasses: 0,
        approvedPasses: 0,
        deniedPasses: 0,
        activePasses: 0,
      });
    }
    const s = map.get(student_id)!;
    s.totalPasses++;
    if (status === "cso_approved") s.approvedPasses++;
    else if (status === "rejected") s.deniedPasses++;
    else s.activePasses++; // pending or dsa_approved
  });

  return map;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login");
    }

    // Verify user is DSA staff
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (staffError || !staff || staff.role !== "DSA") {
      toast.error("Unauthorized access");
      throw redirect("/login");
    }

    // Fetch students + hostel info
    const { data: students, error: studentsError } = await supabase
      .from("student")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        phone_number,
        matric_no,
        department,
        guardian_name,
        guardian_phone_number,
        level,
        hostel_id,
        room_number,
        bed_number,
        hostel:hostel_id ( name, gender )
      `
      )
      .order("first_name", { ascending: true });

    if (studentsError) throw studentsError;

    // Fetch pass counts
    const { data: passes } = await supabase
      .from("pass")
      .select("student_id, status");

    const statsMap = buildStudentPassStats(passes ?? []);

    const enrichedStudents = (students ?? []).map((s) => ({
      ...s,
      ...(statsMap.get(s.id) ?? {
        totalPasses: 0,
        approvedPasses: 0,
        deniedPasses: 0,
        activePasses: 0,
      }),
    }));

    return { students: enrichedStudents, error: null };
  } catch (error) {
    console.error("Students loader error:", error);
    return { students: [], error: "Failed to load student data" };
  }
}

export function HydrateFallback() {
  return <Loader />;
}

export default function CSOStudentsPage({ loaderData }: Route.ComponentProps) {
  const { students, error } = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [hostelFilter, setHostelFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(
    null
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeaders
          mainText="Students"
          subText="View and manage student information"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name ?? ""} ${student.last_name ?? ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (student.matric_no ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const hostelName = getHostelName(student.hostel);
    const matchesHostel =
      hostelFilter === "all" || hostelName === hostelFilter;
    return matchesSearch && matchesHostel;
  });

  const handleViewDetails = (student: StudentRow) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const hostels = Array.from(
    new Set(
      students
        .map((s) => getHostelName(s.hostel))
        .filter((name): name is string => name !== null)
    )
  );

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Students"
        subText="View and manage student information"
      />

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
          <CardDescription>
            {filteredStudents.length}{" "}
            {filteredStudents.length === 1 ? "student" : "students"} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={hostelFilter} onValueChange={setHostelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by hostel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hostels</SelectItem>
                  {hostels.map((hostel) => (
                    <SelectItem key={hostel} value={hostel}>
                      {hostel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Hostel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Total Passes</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.matric_no ?? student.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {`${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getHostelName(student.hostel)}</TableCell>
                      <TableCell>{student.room_number}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{student.totalPasses}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.activePasses > 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            {student.activePasses}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(student)}
                        >
                          <Eye className="h-4 w-4" />
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

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Complete information for{" "}
              {selectedStudent &&
                `${selectedStudent.first_name ?? ""} ${selectedStudent.last_name ?? ""}`.trim()}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="text-sm font-medium">
                      {selectedStudent.matric_no ?? selectedStudent.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">
                      {`${selectedStudent.first_name ?? ""} ${selectedStudent.last_name ?? ""}`.trim()}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">
                        {selectedStudent.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">
                        {selectedStudent.phone_number ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Accommodation
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Hostel</p>
                      <p className="text-sm font-medium">
                        {getHostelName(selectedStudent.hostel) ?? "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Room Number</p>
                    <p className="text-sm font-medium">
                      {selectedStudent.room_number ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Pass Statistics
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Passes
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {selectedStudent.totalPasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedStudent.approvedPasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Denied</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedStudent.deniedPasses}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedStudent.activePasses}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Parent/Guardian Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">
                      {selectedStudent.guardian_name ?? "N/A"}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">
                        {selectedStudent.guardian_phone_number ?? "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
