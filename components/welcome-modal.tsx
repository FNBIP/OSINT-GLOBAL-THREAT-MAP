"use client";

import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Map,
  Rss,
  Search,
  Globe,
  Shield,
  Layers,
} from "lucide-react";

const WELCOME_DISMISSED_KEY = "globalthreatmap_welcome_dismissed";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Map className="h-6 w-6" />,
    title: "Interactive Threat Map",
    description:
      "Explore global events with color-coded markers. Click any event for details, or zoom to see clusters expand.",
    color: "text-red-500",
  },
  {
    icon: <Rss className="h-6 w-6" />,
    title: "Event Feed",
    description:
      "Browse live events in the sidebar. Filter by threat level, category, or search for specific incidents.",
    color: "text-orange-500",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Country Intelligence",
    description:
      "Click any country on the map to view current and historical conflicts with AI-powered analysis.",
    color: "text-blue-500",
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "Intel Dossiers",
    description:
      "Build intelligence dossiers on any actor. Enable full dossier mode for ~50 page reports with downloadable CSV data exports and PowerPoint briefings.",
    color: "text-purple-500",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Military Bases",
    description:
      "View US and NATO military installations worldwide. Click any base (green marker) on the map for details about the facility.",
    color: "text-green-500",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: "Auto-Pan Mode",
    description:
      "Click on the play button by the bottom left to make the map auto-pan.",
    color: "text-cyan-500",
  },
];

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomeModal({ open, onOpenChange }: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-3xl">
      <DialogHeader onClose={handleClose}>
        <DialogTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Welcome to Global Threat Map
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[60vh]">
        <p className="mb-6 text-muted-foreground">
          Your situational awareness platform for tracking global
          security events, wars, conflicts & threat indicators.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="mb-2 flex items-center gap-3">
                <div className={feature.color}>{feature.icon}</div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>

      <DialogFooter className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background accent-primary"
          />
          Don&apos;t show this again
        </label>
        <Button onClick={handleClose}>Get Started</Button>
      </DialogFooter>
    </Dialog>
  );
}
