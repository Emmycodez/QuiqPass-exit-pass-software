import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet, useLoaderData } from "react-router";
import { supabase } from "supabase/supabase-client";
import CustomSidebar from "~/components/global/custom-sidebar";
import { SidebarFeedbackForm } from "~/components/global/sidebar-form";
import { NavMain } from "~/components/nav-main";

export async function clientLoader() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { unreadCount: 0 };

  const { count } = await supabase
    .from("notification")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("recipient_type", "staff")
    .eq("is_read", false);

  return { unreadCount: count ?? 0 };
}

const CSODashboardLayout = () => {
  const { unreadCount } = useLoaderData() as { unreadCount: number };

  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%,#ffffff 40%,#a78bfa 100%",
  };

  const navMain = [
    {
      title: "Dashboard",
      url: "/cso-dashboard",
      icon: IconDashboard,
      route: "cso-dashboard",
    },
    {
      title: "Pass Requests",
      url: "/cso-dashboard/pass-requests",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/cso-dashboard/analytics",
      icon: IconChartBar,
    },
    {
      title: "Students",
      url: "/cso-dashboard/students",
      icon: IconUsers,
    },
    {
      title: "Notifications",
      url: "/cso-dashboard/notifications",
      icon: IconBell,
      unread: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <div className="min-h-screen relative" suppressHydrationWarning>
      {/* Main Gradient Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 10%, #fff 40%, #6366f1 100%)",
        }}
      />

      {/* Sidebar and content */}
      <div className="relative z-10">
        <CustomSidebar gradientStyle={gradientStyle}>
          <NavMain items={navMain} />
          <SidebarFeedbackForm route="CSO" />
        </CustomSidebar>

        <div className="ml-0 md:ml-64 min-h-screen">
          <div className="p-[24px]">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSODashboardLayout;
