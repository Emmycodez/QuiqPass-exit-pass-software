import { Calendar, Clock, XCircle } from "lucide-react";

export const mockData = {
  activePasses: 1,
  upcomingExit: {
    date: "2024-01-15",
    time: "14:00",
    destination: "Home Visit",
    type: "Long Pass",
  },
  deniedRequests: 0,
  recentRequests: [
    {
      id: 1,
      type: "Short Pass",
      destination: "Medical Appointment",
      date: "2024-01-15",
      status: "approved",
      submittedAt: "2024-01-10",
    },
    {
      id: 2,
      type: "Long Pass",
      destination: "Home Visit",
      date: "2024-01-20",
      status: "pending",
      submittedAt: "2024-01-12",
    },
    {
      id: 3,
      type: "Short Pass",
      destination: "Shopping",
      date: "2024-01-08",
      status: "completed",
      submittedAt: "2024-01-05",
    },
  ],
}

export const cards = [
  {
    title: "Active Passes",
    icon: Clock,
    value: mockData.activePasses,
    subtitle: mockData.activePasses === 1 ? "Pending approval" : "Pending approvals",
    valueClass: "text-primary",
  },
  {
    title: "Upcoming Exit",
    icon: Calendar,
    value: mockData.upcomingExit ? "Jan 15" : "None",
    subtitle: mockData.upcomingExit
      ? `${mockData.upcomingExit.time} - ${mockData.upcomingExit.destination}`
      : "No upcoming exits",
    valueClass: "text-foreground",
  },
  {
    title: "Denied Requests",
    icon: XCircle,
    value: mockData.deniedRequests,
    subtitle: "This month",
    valueClass: "text-destructive",
  },
];

