import * as React from "react";
import { PanelLeft, X } from "lucide-react"; // Example icons
import { Button } from "../ui/button"; // Re-use your Button component
import Logo from "./logo";
import { SidebarProvider } from "../ui/sidebar";

interface CustomSidebarProps {
  children: React.ReactNode;
  gradientStyle: React.CSSProperties;
  sidebarFooter?: React.ReactNode;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({
  children,
  gradientStyle,
  sidebarFooter,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <>
      {/* Desktop Sidebar - wrapped in its own SidebarProvider */}
      <SidebarProvider>
        <aside
          className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-10 "
          style={gradientStyle}
        >
          <div className="p-4 flex justify-start items-center">
            <Logo />
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto">{children}</div>
        </aside>
      </SidebarProvider>

      {/* Mobile Trigger - OUTSIDE SidebarProvider */}
      <div className="md:hidden p-4 fixed top-0 left-0 z-50">
        <Button onClick={toggleSidebar} variant="outline" size="icon">
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Offcanvas - wrapped in its own SidebarProvider */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleSidebar}
          />
          <SidebarProvider>
            <div
              className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
              style={gradientStyle}
            >
              <div className="flex h-full flex-col">
                <div className="p-4 flex justify-between items-center">
                  <Logo />
                  <Button onClick={toggleSidebar} variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-col flex-1 overflow-y-auto">
                  <div>{children}</div>
                </div>
              </div>
            </div>
          </SidebarProvider>
        </>
      )}
    </>
  );
};
export default CustomSidebar;
