import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import toast from "react-hot-toast";
import Loader from "~/components/loader";
import { DashboardHeaders } from "~/components/dashboard";
import type { Route } from "./+types/analytics";

// Client Loader - Fetch analytics data
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login");
    }

    // Verify user is CSO staff
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    if (staffError || !staff || staff.role !== "CSO") {
      toast.error("Unauthorized access");
      throw redirect("/dashboard");
    }

    // Get current date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startOfSixMonths = new Date(now);
    startOfSixMonths.setMonth(now.getMonth() - 6);

    // Fetch total requests this month
    const { count: totalRequests, error: totalError } = await supabase
      .from("pass")
      .select("*", { count: "exact", head: true })
      .gte("requested_at", startOfMonth.toISOString());

    // Fetch last month's total for comparison
    const { count: lastMonthTotal, error: lastMonthError } = await supabase
      .from("pass")
      .select("*", { count: "exact", head: true })
      .gte("requested_at", startOfLastMonth.toISOString())
      .lte("requested_at", endOfLastMonth.toISOString());

    // Fetch approved requests this month
    const { count: approvedCount, error: approvedError } = await supabase
      .from("pass")
      .select("*", { count: "exact", head: true })
      .eq("status", "cso_approved")
      .gte("requested_at", startOfMonth.toISOString());

    // Fetch last month's approved for comparison
    const { count: lastMonthApproved, error: lastMonthApprovedError } =
      await supabase
        .from("pass")
        .select("*", { count: "exact", head: true })
        .eq("status", "cso_approved")
        .gte("requested_at", startOfLastMonth.toISOString())
        .lte("requested_at", endOfLastMonth.toISOString());

    // Fetch active (pending) requests
    const { count: activeRequests, error: activeError } = await supabase
      .from("pass")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "dsa_approved"]);

    // Fetch weekly data (last 7 days)
    const { data: weeklyPasses, error: weeklyError } = await supabase
      .from("pass")
      .select("status, requested_at")
      .gte("requested_at", startOfWeek.toISOString())
      .order("requested_at", { ascending: true });

    // Fetch monthly data (last 6 months)
    const { data: monthlyPasses, error: monthlyError } = await supabase
      .from("pass")
      .select("type, requested_at")
      .gte("requested_at", startOfSixMonths.toISOString())
      .order("requested_at", { ascending: true });

    // Fetch pass type distribution (semester-wide)
    const { data: passTypes, error: typesError } = await supabase
      .from("pass")
      .select("type");

    // Fetch requests by hostel
    const { data: hostelRequests, error: hostelError } = await supabase
      .from("pass")
      .select(
        `
        id,
        student:student_id (
          hostel:hostel_id (
            id,
            name
          )
        )
      `
      )
      .gte("requested_at", startOfSixMonths.toISOString());

    // Calculate approval rate
    const approvalRate =
      totalRequests && totalRequests > 0
        ? Math.round((approvedCount || 0) / totalRequests * 100)
        : 0;

    const lastMonthApprovalRate =
      lastMonthTotal && lastMonthTotal > 0
        ? Math.round((lastMonthApproved || 0) / lastMonthTotal * 100)
        : 0;

    // Calculate percentage changes
    const requestsChange =
      lastMonthTotal && lastMonthTotal > 0
        ? Math.round(
            ((totalRequests || 0) - lastMonthTotal) / lastMonthTotal * 100
          )
        : 0;

    const approvalRateChange = approvalRate - lastMonthApprovalRate;

    // Calculate average processing time (CSO approval time)
    const { data: processingData, error: processingError } = await supabase
      .from("pass")
      .select("dsa_approved_at, cso_approved_at")
      .eq("status", "cso_approved")
      .not("dsa_approved_at", "is", null)
      .not("cso_approved_at", "is", null)
      .gte("cso_approved_at", startOfMonth.toISOString());

    let avgProcessingTime = 0;
    if (processingData && processingData.length > 0) {
      const totalHours = processingData.reduce((sum, pass) => {
        const dsaTime = new Date(pass.dsa_approved_at!).getTime();
        const csoTime = new Date(pass.cso_approved_at!).getTime();
        return sum + (csoTime - dsaTime) / (1000 * 60 * 60); // Convert to hours
      }, 0);
      avgProcessingTime = totalHours / processingData.length;
    }

    // Process weekly data
    const weeklyData = processWeeklyData(weeklyPasses || []);

    // Process monthly data
    const monthlyData = processMonthlyData(monthlyPasses || []);

    // Process pass type data
    const passTypeData = processPassTypeData(passTypes || []);

    // Process hostel data
    const hostelData = processHostelData(hostelRequests || []);

    return {
      metrics: {
        totalRequests: totalRequests || 0,
        requestsChange,
        approvalRate,
        approvalRateChange,
        avgProcessingTime: avgProcessingTime.toFixed(1),
        activeRequests: activeRequests || 0,
      },
      weeklyData,
      monthlyData,
      passTypeData,
      hostelData,
      error: null,
    };
  } catch (error) {
    console.error("Analytics loader error:", error);
    return {
      metrics: {
        totalRequests: 0,
        requestsChange: 0,
        approvalRate: 0,
        approvalRateChange: 0,
        avgProcessingTime: "0",
        activeRequests: 0,
      },
      weeklyData: [],
      monthlyData: [],
      passTypeData: [],
      hostelData: [],
      error: "Failed to load analytics data",
    };
  }
}

// Helper function to process weekly data
function processWeeklyData(passes: any[]) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekData = Array(7)
    .fill(0)
    .map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: days[date.getDay()],
        approved: 0,
        denied: 0,
        pending: 0,
      };
    });

  passes.forEach((pass) => {
    const passDate = new Date(pass.requested_at);
    const dayIndex = (passDate.getDay() + 6) % 7; // Adjust to start from Monday

    if (dayIndex >= 0 && dayIndex < 7) {
      if (pass.status === "cso_approved") weekData[dayIndex].approved++;
      else if (pass.status === "rejected") weekData[dayIndex].denied++;
      else weekData[dayIndex].pending++;
    }
  });

  return weekData;
}

// Helper function to process monthly data
function processMonthlyData(passes: any[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthData: { [key: string]: { month: string; short: number; long: number } } = {};

  passes.forEach((pass) => {
    const passDate = new Date(pass.requested_at);
    const monthKey = `${passDate.getFullYear()}-${passDate.getMonth()}`;
    const monthName = months[passDate.getMonth()];

    if (!monthData[monthKey]) {
      monthData[monthKey] = { month: monthName, short: 0, long: 0 };
    }

    if (pass.type === "short") monthData[monthKey].short++;
    else if (pass.type === "long") monthData[monthKey].long++;
  });

  return Object.values(monthData).slice(-6);
}

// Helper function to process pass type data
function processPassTypeData(passes: any[]) {
  const shortCount = passes.filter((p) => p.type === "short").length;
  const longCount = passes.filter((p) => p.type === "long").length;

  return [
    { name: "Short Pass", value: shortCount, color: "hsl(142, 76%, 36%)" },
    { name: "Long Pass", value: longCount, color: "hsl(221, 83%, 53%)" },
  ];
}

// Helper function to process hostel data
function processHostelData(passes: any[]) {
  const hostelCounts: { [key: string]: number } = {};

  passes.forEach((pass) => {
    const hostelName = pass.student?.hostel?.name;
    if (hostelName) {
      hostelCounts[hostelName] = (hostelCounts[hostelName] || 0) + 1;
    }
  });

  return Object.entries(hostelCounts)
    .map(([hostel, requests]) => ({ hostel, requests }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 6);
}

export function HydrateFallback() {
  return <Loader />;
}

export default function AnalyticsPage({ loaderData }: Route.ComponentProps) {
  const { metrics, weeklyData, monthlyData, passTypeData, hostelData, error } =
    loaderData;

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeaders
          mainText="Analytics"
          subText="View pass request trends and statistics"
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeaders
        mainText="Analytics"
        subText="View pass request trends and statistics"
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics.requestsChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">
                    +{metrics.requestsChange}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics.requestsChange}%</span>
                </>
              )}{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approvalRate}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics.approvalRateChange >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">
                    +{metrics.approvalRateChange}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">
                    {metrics.approvalRateChange}%
                  </span>
                </>
              )}{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Processing Time
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgProcessingTime}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              DSA to CSO approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Requests
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Request Overview</CardTitle>
            <CardDescription>
              Pass request statuses for the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="denied" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pass Type Distribution</CardTitle>
            <CardDescription>Short vs Long passes this semester</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={passTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {passTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Pass requests over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="short"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="long"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests by Hostel</CardTitle>
            <CardDescription>
              Total requests per hostel this semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hostelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="hostel" type="category" width={100} />
                <Tooltip />
                <Bar
                  dataKey="requests"
                  fill="hsl(142, 76%, 36%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}