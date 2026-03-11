import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet, useLoaderData, useNavigation } from "react-router";
import { supabase } from "supabase/supabase-client";
import CustomSidebar from "~/components/global/custom-sidebar";
import { SidebarFeedbackForm } from "~/components/global/sidebar-form";
import Loader from "~/components/loader";
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

const DsaDashboardLayout = () => {
  const { unreadCount } = useLoaderData() as { unreadCount: number };
  const navigation = useNavigation();

  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%,#ffffff 40%,#a78bfa 100%",
  };

  const navMain = [
    {
      title: "Dashboard",
      url: "/dsa-dashboard",
      icon: IconDashboard,
      route: "dsa-dashboard",
    },
    {
      title: "Pass Requests",
      url: "/dsa-dashboard/pass-requests",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/dsa-dashboard/analytics",
      icon: IconChartBar,
    },
    {
      title: "Students",
      url: "/dsa-dashboard/students",
      icon: IconUsers,
    },
    {
      title: "Notifications",
      url: "/dsa-dashboard/notifications",
      icon: IconBell,
      unread: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  const isNavigating = Boolean(navigation.location);
  if (isNavigating) return <Loader />;

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
          <SidebarFeedbackForm route="DSA" />
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

export default DsaDashboardLayout;
