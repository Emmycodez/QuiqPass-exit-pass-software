import {
  IconClipboardList,
  IconDashboard,
  IconBuilding,
  IconDoor,
  IconSettings,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";
import { Outlet, redirect, useLoaderData } from "react-router";
import { supabase } from "supabase/supabase-client";
import { PwaInstallPrompt } from "~/components/pwa-install-prompt";
import CustomSidebar from "~/components/global/custom-sidebar";
import { NavMain } from "~/components/nav-main";
import { usePushSubscription } from "~/hooks/use-push-subscription";
import { SidebarFeedbackForm } from "~/components/global/sidebar-form";

export async function clientLoader() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/staff-login");

  const { data: admin, error } = await supabase
    .from("staff")
    .select("id, first_name, last_name, email, role")
    .eq("id", user.id)
    .single();

  if (error || !admin || admin.role !== "admin") {
    await supabase.auth.signOut();
    throw redirect("/staff-login");
  }

  return { admin };
}

export type AdminLayoutData = Awaited<ReturnType<typeof clientLoader>>;

const AdminDashboardLayout = () => {
  const { admin } = useLoaderData() as AdminLayoutData;
  usePushSubscription();

  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #6366f1 100%)",
  };

  const navMain = [
    { title: "Dashboard", url: "/admin-dashboard", icon: IconDashboard },
    { title: "Staff", url: "/admin-dashboard/staff", icon: IconShield },
    { title: "Hostels", url: "/admin-dashboard/hostels", icon: IconBuilding },
    { title: "Rooms", url: "/admin-dashboard/rooms", icon: IconDoor },
    { title: "Students", url: "/admin-dashboard/students", icon: IconUsers },
    { title: "Audit Logs", url: "/admin-dashboard/audit-logs", icon: IconClipboardList },
    { title: "Settings", url: "/admin-dashboard/settings", icon: IconSettings },
  ];

  return (
    <div className="min-h-screen relative" suppressHydrationWarning>
      <PwaInstallPrompt />
      <div className="fixed inset-0 z-0" style={{ background: "radial-gradient(125% 125% at 50% 10%, #fff 40%, #6366f1 100%)" }} />
      <div className="relative z-10">
        <CustomSidebar gradientStyle={gradientStyle} footer={<SidebarFeedbackForm route="Admin" />}>
          <div className="px-4 py-3">
            <p className="text-sm font-medium">{admin.first_name} {admin.last_name}</p>
            <p className="text-xs text-muted-foreground">System Administrator</p>
          </div>
          <NavMain items={navMain} />
        </CustomSidebar>
        <div className="ml-0 md:ml-64 min-h-screen">
          <div className="px-[24px] pb-[24px] pt-16 md:pt-[24px]">
            <Outlet context={{ admin }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
