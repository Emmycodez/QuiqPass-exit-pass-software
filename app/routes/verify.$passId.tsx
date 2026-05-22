import { CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "supabase/supabase-client";
import type { Route } from "./+types/verify.$passId";

type Validity = "VALID" | "EXPIRED" | "NOT_YET_ACTIVE" | "INVALID" | "NOT_FOUND" | "LOADING";

type PassData = {
  id: string;
  status: string;
  type: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  student: {
    first_name: string;
    last_name: string;
    matric_no: string;
    department: string;
  } | null;
};

const validityConfig: Record<
  Validity,
  { label: string; description: string; icon: React.ReactNode; bg: string; border: string; text: string }
> = {
  VALID: {
    label: "Valid Pass",
    description: "This student is authorized to exit campus.",
    icon: <CheckCircle className="h-10 w-10" />,
    bg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-700",
  },
  EXPIRED: {
    label: "Expired",
    description: "This pass has passed its return date.",
    icon: <XCircle className="h-10 w-10" />,
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-700",
  },
  NOT_YET_ACTIVE: {
    label: "Not Yet Active",
    description: "This pass departure date has not started yet.",
    icon: <Clock className="h-10 w-10" />,
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    text: "text-yellow-700",
  },
  INVALID: {
    label: "Invalid Pass",
    description: "This pass has not been fully approved.",
    icon: <XCircle className="h-10 w-10" />,
    bg: "bg-red-50",
    border: "border-red-400",
    text: "text-red-700",
  },
  NOT_FOUND: {
    label: "Pass Not Found",
    description: "No pass exists with this ID.",
    icon: <AlertTriangle className="h-10 w-10" />,
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-600",
  },
  LOADING: {
    label: "Verifying...",
    description: "Checking pass validity.",
    icon: <ShieldCheck className="h-10 w-10 animate-pulse" />,
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-600",
  },
};

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2 py-2">
      <span className="text-xs text-gray-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  return { passId: params.passId as string };
}

export default function VerifyPage({ loaderData }: Route.ComponentProps) {
  const { passId } = loaderData;
  const [validity, setValidity] = useState<Validity>("LOADING");
  const [pass, setPass] = useState<PassData | null>(null);
  const [verifiedAt] = useState(() => new Date().toLocaleString("en-NG"));

  useEffect(() => {
    async function verify() {
      const { data, error } = await supabase
        .from("pass")
        .select(
          `id, status, type, destination, departure_date, departure_time, return_date, return_time,
           student:student_id (first_name, last_name, matric_no, department)`
        )
        .eq("id", passId)
        .single();

      if (error || !data) {
        setValidity("NOT_FOUND");
        return;
      }

      const student = Array.isArray(data.student) ? data.student[0] : data.student;
      const passData: PassData = { ...data, student: student ?? null };
      setPass(passData);

      const today = new Date().toISOString().split("T")[0];

      if (data.status !== "cso_approved") {
        setValidity("INVALID");
      } else if (today < data.departure_date) {
        setValidity("NOT_YET_ACTIVE");
      } else if (data.return_date && today > data.return_date) {
        setValidity("EXPIRED");
      } else {
        setValidity("VALID");
      }
    }

    verify();
  }, [passId]);

  const config = validityConfig[validity];

  function formatDateTime(date: string, time: string | null) {
    if (!time) return date;
    return `${date} ${time.slice(0, 5)}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center">
          <img
            src="/wellspring-logo.jpg"
            alt="Wellspring University"
            className="h-10 mx-auto mb-2 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <h1 className="text-xl font-bold text-gray-900">Pass Verification</h1>
          <p className="text-xs text-gray-400">QuiqPass — Wellspring University</p>
        </div>

        {/* Validity Badge */}
        <div className={`rounded-xl border-2 p-5 text-center ${config.bg} ${config.border}`}>
          <div className={`flex justify-center mb-2 ${config.text}`}>{config.icon}</div>
          <p className={`text-xl font-bold ${config.text}`}>{config.label}</p>
          <p className={`text-sm mt-1 ${config.text} opacity-80`}>{config.description}</p>
        </div>

        {/* Pass Details */}
        {pass && (
          <div className="rounded-xl border bg-white shadow-sm p-4 divide-y divide-gray-100">
            <div className="pb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Student</p>
              {pass.student ? (
                <>
                  <InfoRow label="Name" value={`${pass.student.first_name} ${pass.student.last_name}`} />
                  <InfoRow label="Matric No." value={pass.student.matric_no} mono />
                  <InfoRow label="Department" value={pass.student.department} />
                </>
              ) : (
                <p className="text-sm text-gray-400">Student info unavailable</p>
              )}
            </div>

            <div className="pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pass Details</p>
              <InfoRow label="Pass Type" value={pass.type === "long" ? "Long Pass" : "Short Pass"} />
              <InfoRow label="Destination" value={pass.destination || "N/A"} />
              <InfoRow
                label="Departure"
                value={formatDateTime(pass.departure_date, pass.departure_time)}
              />
              {pass.return_date && (
                <InfoRow
                  label="Return"
                  value={formatDateTime(pass.return_date, pass.return_time)}
                />
              )}
              <InfoRow label="Pass ID" value={pass.id.slice(0, 12).toUpperCase()} mono />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Verified at {verifiedAt}</p>
      </div>
    </div>
  );
}
