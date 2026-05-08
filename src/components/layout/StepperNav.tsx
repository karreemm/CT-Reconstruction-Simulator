import { useCTStore } from "@/store/ctStore";
import type { StepStatus } from "@/types";
import { Heart, Radio, Waves, Microscope, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Scan, Rotate3D, ChartColumn } from "lucide-react";

export const STEPS = [
  { icon: Heart, label: "Phantom", emoji: Box },
  { icon: Radio, label: "Projections", emoji: Scan },
  { icon: Waves, label: "Sinogram", emoji: Waves },
  { icon: Microscope, label: "Reconstruction", emoji: Rotate3D },
  { icon: BarChart3, label: "Comparison", emoji: ChartColumn },
];

const statusColors: Record<StepStatus, string> = {
  locked: "bg-muted text-muted-foreground",
  ready: "bg-primary/20 text-primary border border-primary/30",
  running: "bg-algo-bp/20 text-foreground animate-pulse-glow",
  done: "bg-algo-art/20 text-foreground",
};

const statusLabels: Record<StepStatus, string> = {
  locked: "Locked",
  ready: "Ready",
  running: "Running",
  done: "Done",
};

export function StepperNav({
  setSidebarOpen,
  isMobile,
}: {
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}) {
  const { activeStep, setActiveStep, stepStatus } = useCTStore();

  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="text-xs font-mono text-primary/60 uppercase tracking-widest mb-3 px-2">
        Pipeline
      </div>
      {STEPS.map((step, idx) => {
        const status = stepStatus[idx] || "locked";
        const isActive = idx === activeStep;
        const isClickable = status !== "locked";

        return (
          <div key={idx}>
            <button
              onClick={() =>
                isClickable &&
                (setActiveStep(idx), isMobile && setSidebarOpen(false))
              }
              disabled={!isClickable}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 border border-primary/30 glow-sm"
                  : isClickable
                    ? "hover:bg-accent/50"
                    : "opacity-40 cursor-not-allowed"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-mono font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  <span>
                    <step.emoji />
                  </span>
                  <span>{step.label}</span>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 mt-0.5 ${statusColors[status]}`}
                >
                  {statusLabels[status]}
                </Badge>
              </div>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="flex justify-center py-1">
                <Separator
                  orientation="vertical"
                  className="h-3 bg-border/30"
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
