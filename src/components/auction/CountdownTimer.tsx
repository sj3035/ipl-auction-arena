import { Progress } from "@/components/ui/progress";
import { TIMER_DURATION } from "@/data/teams";

interface CountdownTimerProps {
  timer: number;
}

export function CountdownTimer({ timer }: CountdownTimerProps) {
  const percentage = (timer / TIMER_DURATION) * 100;

  // Granular color stages
  const getTimerColor = () => {
    if (timer <= 3) return { text: "text-destructive animate-pulse font-black", bar: "[&>div]:bg-destructive" };
    if (timer <= 5) return { text: "text-destructive font-bold", bar: "[&>div]:bg-destructive" };
    if (timer <= 8) return { text: "text-orange-500 font-bold", bar: "[&>div]:bg-orange-500" };
    if (timer <= 11) return { text: "text-yellow-500 font-semibold", bar: "[&>div]:bg-yellow-500" };
    return { text: "text-foreground font-bold", bar: "[&>div]:bg-primary" };
  };

  const colors = getTimerColor();

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Time Remaining</span>
        <span className={`text-lg font-mono transition-colors duration-300 ${colors.text}`}>
          {timer}s
        </span>
      </div>
      <Progress
        value={percentage}
        className={`h-2 transition-all duration-300 ${colors.bar}`}
      />
    </div>
  );
}
