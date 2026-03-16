import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/home/layout.tsx", [index("routes/home/home.tsx")]),

  route("login", "routes/auth/login.tsx"),
  route("staff-login", "routes/auth/staff-login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("auth/callback", "routes/auth/callback.tsx"),
  route("onboarding", "routes/auth/onboarding.tsx"),
  layout("routes/student_dashboard/layout.tsx", [
    route(
      "/student-dashboard",
      "routes/student_dashboard/student-dashboard.tsx",
    ),
    route(
      "/student-dashboard/apply-for-pass",
      "routes/student_dashboard/apply-for-pass.tsx",
    ),
    route(
      "/student-dashboard/my-pass-requests",
      "routes/student_dashboard/my-pass-requests.tsx",
    ),
    route(
      "/student-dashboard/my-profile",
      "routes/student_dashboard/profile.tsx",
    ),
    route(
      "/student-dashboard/notifications",
      "routes/student_dashboard/notifications.tsx",
    ),
    route(
      "/student-dashboard/settings",
      "routes/student_dashboard/settings.tsx",
    ),
  ]),
  layout("routes/dsa_dashboard/layout.tsx", [
    route("/dsa-dashboard", "routes/dsa_dashboard/dsa-dashboard.tsx"),
    route("/dsa-dashboard/analytics", "routes/dsa_dashboard/analytics.tsx"),
    route(
      "/dsa-dashboard/pass-requests",
      "routes/dsa_dashboard/pass-requests.tsx",
    ),
    route("/dsa-dashboard/students", "routes/dsa_dashboard/students.tsx"),
    route("/dsa-dashboard/notifications", "routes/dsa_dashboard/notifications.tsx"),
    route("/dsa-dashboard/settings", "routes/dsa_dashboard/settings.tsx"),
    route("/dsa-dashboard/attendance", "routes/dsa_dashboard/attendance.tsx"),
  ]),
  layout("routes/cso_dashboard/layout.tsx", [
    route("cso-dashboard", "routes/cso_dashboard/cso-dashboard.tsx"),
    route(
      "/cso-dashboard/pass-requests",
      "routes/cso_dashboard/pass-requests.tsx"
    ),
    route("/cso-dashboard/analytics", "routes/cso_dashboard/analytics.tsx"),
    route("/cso-dashboard/students", "routes/cso_dashboard/students.tsx"),
    route("/cso-dashboard/notifications", "routes/cso_dashboard/notifications.tsx"),
    route("/cso-dashboard/settings", "routes/cso_dashboard/settings.tsx"),
    route("/cso-dashboard/attendance", "routes/cso_dashboard/attendance.tsx"),
  ]),
  layout("routes/porter_dashboard/layout.tsx", [
    route("/porter-dashboard", "routes/porter_dashboard/index.tsx"),
    route("/porter-dashboard/rooms", "routes/porter_dashboard/rooms.tsx"),
    route("/porter-dashboard/mark", "routes/porter_dashboard/mark-attendance.tsx"),
    route("/porter-dashboard/settings", "routes/porter_dashboard/settings.tsx"),
  ]),
  layout("routes/admin/layout.tsx", [
    route("/admin-dashboard", "routes/admin/index.tsx"),
    route("/admin-dashboard/staff", "routes/admin/staff.tsx"),
    route("/admin-dashboard/hostels", "routes/admin/hostels.tsx"),
    route("/admin-dashboard/rooms", "routes/admin/rooms.tsx"),
    route("/admin-dashboard/students", "routes/admin/students.tsx"),
    route("/admin-dashboard/audit-logs", "routes/admin/audit-logs.tsx"),
    route("/admin-dashboard/settings", "routes/admin/settings.tsx"),
  ]),
  route("/test", "dashboard/page.tsx"),
  route("dashboard", "routes/auth/dashboard.tsx"),
] satisfies RouteConfig;
