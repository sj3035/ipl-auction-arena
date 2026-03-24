import { Progress } from "@/components/ui/progress";
import { TIMER_DURATION } from "@/data/teams";

interface CountdownTimerProps {
  timer: number;
}

export function CountdownTimer({ timer }: CountdownTimerProps) {
  const percentage = (timer / TIMER_DURATION) * 100;
  const isUrgent = timer <= 5;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Time Remaining</span>
        <span className={`text-lg font-mono font-bold ${isUrgent ? "text-destructive animate-pulse" : "text-foreground"}`}>
          {timer}s
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${isUrgent ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`}
      />
    </div>
  );
}
