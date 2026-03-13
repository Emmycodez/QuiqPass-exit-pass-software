"use client";

import { ExternalLink, Monitor, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// ─── YouTube video links — fill these in ────────────────────────────────────
// UPDATE THESE three constants with your YouTube links:
const YOUTUBE_ANDROID =
  "https://youtube.com/shorts/Ak3otWdJtDg?si=ZZQ5Xnx0uLzikh94";
const YOUTUBE_IOS =
  "https://youtube.com/shorts/xL8WMqbqca8?si=OWk7oJmzM8ga4ecK";
const YOUTUBE_PC = "https://youtu.be/vaZCRZbV7Ok?si=jN8UQcOI2oUMDW50";
// ────────────────────────────────────────────────────────────────────────────

type Platform = "ios" | "android" | "pc";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "pc";
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream: unknown }).MSStream
  )
    return "ios";
  if (/android/i.test(ua)) return "android";
  return "pc";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const STORAGE_KEY = "quiqpass_install_dismissed";

const instructions: Record<
  Platform,
  { icon: React.ReactNode; title: string; steps: string[]; youtubeUrl: string }
> = {
  android: {
    icon: <Smartphone className="h-5 w-5" />,
    title: "Install on Android",
    steps: [
      "Open QuiqPass in Chrome.",
      "Tap the three-dot menu (⋮) in the top-right corner.",
      'Select "Add to Home screen".',
      'Tap "Add" in the confirmation dialog.',
      "QuiqPass will appear on your home screen like a native app.",
    ],
    youtubeUrl: YOUTUBE_ANDROID,
  },
  ios: {
    icon: <Smartphone className="h-5 w-5" />,
    title: "Install on iPhone / iPad",
    steps: [
      "Open QuiqPass in Safari or Chrome.",
      "Tap the Share button (□ with an arrow) at the bottom of the screen.",
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" in the top-right corner.',
      "QuiqPass will appear on your home screen like a native app.",
    ],
    youtubeUrl: YOUTUBE_IOS,
  },
  pc: {
    icon: <Monitor className="h-5 w-5" />,
    title: "Install on PC / Mac",
    steps: [
      "Open QuiqPass in Chrome or Edge.",
      "Look for the install icon (⊕) in the address bar on the right side.",
      'Click it and select "Install".',
      "Alternatively: open the browser menu (⋮) → 'Install QuiqPass'.",
      "QuiqPass will open as a standalone desktop app.",
    ],
    youtubeUrl: YOUTUBE_PC,
  },
};

export function PwaInstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("pc");

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalone()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    setPlatform(detectPlatform());

    // Small delay so it doesn't pop up instantly on page load
    const timer = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const info = instructions[platform];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleDismiss();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {info.icon}
            {info.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Install QuiqPass as an app for the best experience — faster access,
          offline support, and push notifications.
        </p>

        {/* Step-by-step instructions */}
        <ol className="space-y-2 text-sm">
          {info.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {/* YouTube link */}
        <a
          href={info.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Watch video tutorial
        </a>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
