import { MailIcon, PlusCircleIcon, type LucideIcon } from "lucide-react";
import type { Icon } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { Link } from "react-router";
import { useLocation } from "react-router";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon | Icon;
    unread?: number | undefined;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Apply For Pass"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <Link
                to="/student-dashboard/apply-for-pass"
                className="flex items-center gap-2 cursor-pointer"
              >
                <PlusCircleIcon />
                <span>Apply For Pass</span>
              </Link>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            let location = useLocation();
            const { pathname } = location;
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <Link to={item.url} className="relative">
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    className="w-full justify-start"
                  >
                    {/* Icon Wrapper with Badge */}
                    <div className="relative mr-2">
                      {item.icon && <item.icon className="h-4 w-4" />}

                      {item.unread && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-white text-[8px] font-bold">
                          {item.unread > 99 ? "99+" : item.unread}
                        </span>
                      )}
                    </div>

                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
