import { Outlet } from "react-router";
import { Navbar } from "./_components";

const HomePageLayout = () => {
  return (
    <div>
      <Navbar /> 
      <div className="min-h-screen relative w-full">
        {/* This div now only contains the gradient background and the main content */}
        <div
          className="fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(125% 125% at 50% 90%, #fff 40%, #6366f1 100%)",
          }}
        />

        <div className="relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default HomePageLayout;