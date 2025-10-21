import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/home/layout.tsx",[
 index("routes/home/home.tsx"),
  ] ),
 
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("auth/callback", "routes/auth/callback.tsx"),
  route("onboarding", "routes/auth/onboarding.tsx"),
  layout("routes/student_dashboard/layout.tsx", [
 route("/student-dashboard", "routes/student_dashboard/student-dashboard.tsx"),
  ]),
  route("/test", "dashboard/page.tsx"),
  route("dashboard", "routes/auth/dashboard.tsx")
 
] satisfies RouteConfig;