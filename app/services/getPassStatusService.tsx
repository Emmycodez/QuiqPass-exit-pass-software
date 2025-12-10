import { CheckCircle, Clock, XCircle } from "lucide-react";

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "denied":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "dsa_approved":
      return "bg-yellow-100 text-green-800 border-green-200";
    case "cso_approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "completed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
