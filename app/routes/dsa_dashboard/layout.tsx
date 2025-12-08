import {
  IconBell,
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet, useLoaderData, redirect } from "react-router";
import { supabase } from "supabase/supabase-client";
import CustomSidebar from "~/components/global/custom-sidebar";
import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
// TODO: Implement protected route logic

export async function clientLoader() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    return redirect("login");
  }

  const [profileRes, notifRes] = await Promise.all([
    supabase
      .from("student")
      .select("first_name, last_name,email, photo_url")
      .eq("id", user.id)
      .single(),

    supabase
      .from("notification")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("recipient_type", "student")
      .eq("is_read", false),
  ]);

  if (profileRes.error) {
    console.error("Failed to load profile: ", profileRes.error);
    return redirect("/login");
  }

  return {
    user,
    profile: profileRes.data,
    unreadCount: notifRes.count || 0,
  };
}

export type DSALayoutData = Exclude<
  Awaited<ReturnType<typeof clientLoader>>,
  Response
>;

const DsaDashboardLayout = () => {
  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%,#ffffff 40%,#a78bfa 100%",
  };

  const { profile, unreadCount } = useLoaderData() as DSALayoutData;

  const data = {
    user: {
      name: profile.first_name + " " + profile.last_name,
      email: profile.email,
      avatar: profile.photo_url || undefined,
    },
    navMain: [
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
      {
        title: "Settings",
        url: "/dsa-dashboard/settings",
        icon: IconSettings,
      },
    ],
    navClouds: [
      {
        title: "Capture",
        icon: IconCamera,
        isActive: true,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
      {
        title: "Proposal",
        icon: IconFileDescription,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
      {
        title: "Prompts",
        icon: IconFileAi,
        url: "#",
        items: [
          {
            title: "Active Proposals",
            url: "#",
          },
          {
            title: "Archived",
            url: "#",
          },
        ],
      },
    ],
    navSecondary: [
      {
        title: "Settings",
        url: "#",
        icon: IconSettings,
      },
      {
        title: "Get Help",
        url: "#",
        icon: IconHelp,
      },
      {
        title: "Search",
        url: "#",
        icon: IconSearch,
      },
    ],
    documents: [
      {
        name: "Data Library",
        url: "#",
        icon: IconDatabase,
      },
      {
        name: "Reports",
        url: "#",
        icon: IconReport,
      },
      {
        name: "Word Assistant",
        url: "#",
        icon: IconFileWord,
      },
    ],
  };

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
          <NavMain items={data.navMain} />
          <NavUser user={data.user} />
        </CustomSidebar>

        {/* Content Area - Add left margin to push it away from fixed sidebar */}
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
