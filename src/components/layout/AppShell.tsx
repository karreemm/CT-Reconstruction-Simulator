import { useState, useEffect } from "react";
import { StepperNav, STEPS } from "./StepperNav";
import { useCTStore } from "@/store/ctStore";
import { ColorMapSelector } from "@/components/shared/ColorMapSelector";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimationSpeed } from "@/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXRay } from "@fortawesome/free-solid-svg-icons";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const {
    activeStep,
    stepStatus,
    setActiveStep,
    colormap,
    setColormap,
    animationSpeed,
    setAnimationSpeed,
    resetAll,
  } = useCTStore();

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const nextStep = activeStep + 1;
  const nextStepReady =
    nextStep < STEPS.length && stepStatus[nextStep] !== "locked";

  const goToNextStep = () => {
    if (!nextStepReady) return;
    setActiveStep(nextStep);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:-ml-64"
        } fixed md:relative md:translate-x-0 left-0 top-0 h-screen w-64 transition-all duration-300 border-r border-border/50 bg-card/30 backdrop-blur-xl shrink-0 overflow-hidden z-40 md:z-auto`}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <p className="text-lg font-bold tracking-tight text-primary">
                  CT
                </p>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Simulator</h1>
                <p className="text-[10px] text-muted-foreground">
                  Image Reconstruction
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <StepperNav setSidebarOpen={setSidebarOpen} isMobile={isMobile} />
          </div>
          <div className="p-3 border-t border-border/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase">
                Colormap
              </span>
              <ColorMapSelector value={colormap} onChange={setColormap} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase">
                Speed
              </span>
              <Select
                value={animationSpeed}
                onValueChange={(v) => setAnimationSpeed(v as AnimationSpeed)}
              >
                <SelectTrigger className="w-25 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="instant">Instant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="h-12 border-b border-border/30 flex items-center justify-between px-4 gap-3 bg-card/20 backdrop-blur-md shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          {isMobile && !sidebarOpen && nextStepReady && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs gap-1.5 flex items-center"
              onClick={goToNextStep}
            >
              Next: {STEPS[nextStep].label}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={resetAll}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 grid-bg">{children}</main>
      </div>
    </div>
  );
}
