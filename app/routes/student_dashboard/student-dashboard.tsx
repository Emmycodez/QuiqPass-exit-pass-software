
import { Suspense } from "react";
import { DashboardHeaders } from "~/components/dashboard";
import DashboardSkeleton from "~/components/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cards} from "./data";

const StudentDashboard = () => {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <main className="w-full">
        <DashboardHeaders
          mainText="Student Dashboard"
          subText="Welcome back! Here's your exit pass overview"
          buttonText="Apply for Pass"
          buttonLink="/student-dashboard/apply-for-pass"
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-md font-semibold text-blue-950">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.valueClass}`}>
                  {card.value}
                </div>
                <p className="text-xs text-gray-800">{card.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </Suspense>
  );
};

export default StudentDashboard;
