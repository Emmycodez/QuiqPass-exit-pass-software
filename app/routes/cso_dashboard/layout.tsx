import {
  IconBell,
  IconChartBar,
  IconDashboard,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet } from "react-router";
import CustomSidebar from "~/components/global/custom-sidebar";
import { SidebarFeedbackForm } from "~/components/global/sidebar-form";
import { NavMain } from "~/components/nav-main";

const CSODashboardLayout = () => {
  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%,#ffffff 40%,#a78bfa 100%",
  };

  const navMain = [
    {
      title: "Dashboard",
      url: "/cso-dashboard",
      icon: IconDashboard,
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

        {/* Content Area */}
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
