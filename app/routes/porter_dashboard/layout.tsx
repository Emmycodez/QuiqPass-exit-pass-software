import { IconHome, IconSettings } from "@tabler/icons-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
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

  const { data: porter, error } = await supabase
    .from("staff")
    .select("id, first_name, last_name, email, role, gender")
    .eq("id", user.id)
    .single();

  if (error || !porter || porter.role !== "porter") {
    await supabase.auth.signOut();
    throw redirect("/staff-login");
  }

  return { porter };
}

export type PorterLayoutData = Awaited<ReturnType<typeof clientLoader>>;

const PorterDashboardLayout = () => {
  const { porter } = useLoaderData() as PorterLayoutData;
  usePushSubscription();

  const gradientStyle = {
    background: "radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)",
  };

  const navMain = [
    {
      title: "Hostels",
      url: "/porter-dashboard",
      icon: IconHome,
      route: "porter-dashboard",
    },
    {
      title: "Settings",
      url: "/porter-dashboard/settings",
      icon: IconSettings,
    },
  ];

  return (
    <div className="min-h-screen relative" suppressHydrationWarning>
      <PwaInstallPrompt />
      <div
        className="fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 10%, #fff 40%, #10b981 100%)",
        }}
      />
      <div className="relative z-10">
        <CustomSidebar
          gradientStyle={gradientStyle}
          footer={<SidebarFeedbackForm route="Porter" />}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-1">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-semibold">
                  {porter.first_name[0]}{porter.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-none">
                  {porter.first_name} {porter.last_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {porter.gender ?? "—"} Hostel Porter
                </p>
              </div>
            </div>
          </div>
          <NavMain items={navMain} />
        </CustomSidebar>

        <div className="ml-0 md:ml-64 min-h-screen">
          <div className="px-[24px] pb-[24px] pt-16 md:pt-[24px]">
            <Outlet context={{ porter }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PorterDashboardLayout;
