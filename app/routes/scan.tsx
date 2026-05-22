import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/scan";

export async function clientLoader(_: Route.ClientLoaderArgs) {
  return {};
}

export function HydrateFallback() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading scanner...</div>
    </div>
  );
}

type ScanStatus = "idle" | "scanning" | "denied" | "error";

export default function ScanPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded: string) => {
            const match = decoded.match(/\/verify\/([a-f0-9-]{36})/i);
            if (match) {
              scanner
                .stop()
                .catch(() => {})
                .finally(() => navigate(`/verify/${match[1]}`));
            }
          },
          undefined
        )
        .then(() => {
          if (!cancelled) setStatus("scanning");
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const msg = String(err).toLowerCase();
          setStatus(msg.includes("permission") || msg.includes("notallowed") ? "denied" : "error");
        });
    });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        (s.isScanning ? s.stop() : Promise.resolve())
          .catch(() => {})
          .finally(() => { try { s.clear(); } catch { /* ignore */ } });
      }
    };
  }, []);

  function handleRetry() {
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="bg-indigo-600 rounded-full p-3">
            <Camera className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Scan Pass</h1>
        <p className="text-gray-400 text-sm mt-1">
          Point the camera at a student's exit pass QR code
        </p>
      </div>

      {/* Scanner container — html5-qrcode mounts here */}
      <div
        id="qr-reader"
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ minHeight: 300 }}
      />

      {/* Status messages */}
      {status === "denied" && (
        <div className="text-center space-y-3 max-w-xs">
          <div className="flex justify-center">
            <CameraOff className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-red-400 font-medium">Camera access denied</p>
          <p className="text-gray-500 text-sm">
            Allow camera permission in your browser settings, then reload the page.
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 mx-auto bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="text-center space-y-3 max-w-xs">
          <p className="text-red-400 font-medium">Unable to start the camera</p>
          <p className="text-gray-500 text-sm">
            Make sure no other app is using the camera, then try again.
          </p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 mx-auto bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {status === "scanning" && (
        <p className="text-gray-500 text-xs text-center">
          Hold the QR code steady inside the frame
        </p>
      )}

      <p className="text-gray-700 text-xs">QuiqPass — Wellspring University</p>
    </div>
  );
}
