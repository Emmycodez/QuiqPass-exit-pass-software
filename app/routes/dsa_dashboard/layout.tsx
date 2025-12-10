import {
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
import { useState } from "react";
import { Outlet } from "react-router";
import CustomSidebar from "~/components/global/custom-sidebar";
import { SidebarFeedbackForm } from "~/components/global/sidebar-form";
import { NavMain } from "~/components/nav-main";
// TODO: Implement feedback sending through sidebar feedback form

// export async function clientLoader() {
//   // -----------------------------
//   // 1. Authentication
//   // -----------------------------
//   const {
//     data: { user },
//     error: authError,
//   } = await supabase.auth.getUser();

//   if (authError || !user) {
//     return redirect("/staff-login");
//   }

//   // -----------------------------
//   // 2. Ensure Staff Is DSA
//   // -----------------------------
//   const { data: staff, error: staffError } = await supabase
//     .from("staff")
//     .select("first_name, last_name, email, photo_url, role")
//     .eq("id", user.id)
//     .single();

//   if (staffError || !staff || staff.role !== "DSA") {
//     return redirect("/login"); // or redirect("/staff-login")
//   }

//   // -----------------------------
//   // 3. Get Unread Notifications
//   // -----------------------------
//   const { count: unreadCount } = await supabase
//     .from("notification")
//     .select("id", { count: "exact", head: true })
//     .eq("recipient_id", user.id)
//     .eq("recipient_type", "staff")   // IMPORTANT: staff notifications!
//     .eq("is_read", false);

//   // -----------------------------
//   // 4. Return Layout Data
//   // -----------------------------
//   return {
//     user,
//     profile: staff,   // NOT student
//     unreadCount: unreadCount ?? 0,
//   };
// }

// export type DSALayoutData = Exclude<
//   Awaited<ReturnType<typeof clientLoader>>,
//   Response
// >;

const DsaDashboardLayout = () => {
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    photo_url: "",
    role: "",
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const {
  //       data: { user },
  //     } = await supabase.auth.getUser();

  //     if (!user) {
  //       console.log("There is no user logged in yet")
  //       // window.location.href = "/staff-login";
  //       return redirect("/staff-login");
  //     }
  //     console.log("This is the supabase user: ", user)

  //     // Fetch staff profile
  //     const { data: staff } = await supabase
  //       .from("staff")
  //       .select("first_name, last_name, email, photo_url, role")
  //       .eq("id", user.id)
  //       .single();

  //     if (!staff || staff.role !== "DSA") {
  //       window.location.href = "/staff-login";
  //       return;
  //     }

  //     // Fetch unread notifications
  //     const { count: unread } = await supabase
  //       .from("notification")
  //       .select("id", { count: "exact", head: true })
  //       .eq("recipient_id", user.id)
  //       .eq("recipient_type", "staff")
  //       .eq("is_read", false);

  //     setProfile(staff);
  //     setUnreadCount(unread ?? 0);
  //   };

  //   fetchData();
  // }, []);

  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%,#ffffff 40%,#a78bfa 100%",
  };

  const data = {
    user: {
      name: profile.first_name + " " + profile.last_name,
      email: profile.email,
      avatar: profile.photo_url || undefined,
      unread: unreadCount > 0 ? unreadCount : undefined,
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
        <CustomSidebar
          gradientStyle={gradientStyle}
          sidebarFooter={<SidebarFeedbackForm />}
        >
          <NavMain items={data.navMain} />
          <SidebarFeedbackForm />
          {/* <NavUser user={data.user} /> */}
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
