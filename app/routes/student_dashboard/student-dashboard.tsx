import { Suspense } from "react";
import { DashboardHeaders } from "~/components/dashboard";
import DashboardSkeleton from "~/components/dashboard-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cards, mockData } from "./data";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { getStatusColor, getStatusIcon } from "~/services/getPassStatusService";
import { Badge } from "~/components/ui/badge";

const StudentDashboard = () => {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <main className="w-full space-y-6">
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

        {/* Recent Passes */}
        <Card className="text-gray-800 bg-gray-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="text-gray-800">
              <CardTitle className="text-blue-950 text-lg font-semibold">Recent Requests</CardTitle>
              <CardDescription className="text-gray-800">
                Your latest exit pass applications
              </CardDescription>
            </div>
            <Link to="/student/requests">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-800">
              {mockData.recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg "
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(request.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {request.type}
                        </p>
                        <Badge
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          {request.status.charAt(0).toUpperCase() +
                            request.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {request.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm ">
                      Submitted{" "}
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </Suspense>
  );
};

export default StudentDashboard;
