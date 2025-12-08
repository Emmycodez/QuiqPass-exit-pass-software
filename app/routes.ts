import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/home/layout.tsx",[
 index("routes/home/home.tsx"),
  ] ),
 
  route("login", "routes/auth/login.tsx"),
  route("staff-login", "routes/auth/staff-login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("auth/callback", "routes/auth/callback.tsx"),
  route("onboarding", "routes/auth/onboarding.tsx"),
  layout("routes/student_dashboard/layout.tsx", [
 route("/student-dashboard", "routes/student_dashboard/student-dashboard.tsx"),
 route("/student-dashboard/apply-for-pass", "routes/student_dashboard/apply-for-pass.tsx"),
 route("/student-dashboard/my-pass-requests", "routes/student_dashboard/my-pass-requests.tsx"),
 route("/student-dashboard/my-profile", "routes/student_dashboard/profile.tsx"),
 route("/student-dashboard/notifications", "routes/student_dashboard/notifications.tsx"),
  ]),
  layout("routes/dsa_dashboard/layout.tsx", [
    route("/dsa-dashboard", "routes/dsa_dashboard/dsa-dashboard.tsx"),
  ]),
  route("/test", "dashboard/page.tsx"),
  route("dashboard", "routes/auth/dashboard.tsx")
 
] satisfies RouteConfig;