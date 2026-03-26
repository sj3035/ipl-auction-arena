import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";
import { SKIP_CUTOFF_SECONDS } from "@/context/AuctionContext";
import { TIMER_DURATION } from "@/data/teams";

interface SkipButtonProps {
  timer: number;
  hasSkipped: boolean;
  isLeadingBidder: boolean;
  onSkip: () => void;
}

export function SkipButton({ timer, hasSkipped, isLeadingBidder, onSkip }: SkipButtonProps) {
  const elapsed = TIMER_DURATION - timer;
  const canSkip = elapsed >= (TIMER_DURATION - SKIP_CUTOFF_SECONDS) && !hasSkipped && !isLeadingBidder;
  const timeUntilSkip = Math.max(0, (TIMER_DURATION - SKIP_CUTOFF_SECONDS) - elapsed);

  if (hasSkipped) {
    return (
      <div className="text-xs text-center text-muted-foreground italic py-1">
        ⏭️ You skipped this player
      </div>
    );
  }

  if (isLeadingBidder) {
    return null;
  }

  return (
    <Button
      onClick={onSkip}
      disabled={!canSkip}
      variant="outline"
      size="sm"
      className="w-full text-xs"
    >
      <SkipForward className="w-3 h-3 mr-1" />
      {canSkip ? "Skip Player" : `Skip available in ${timeUntilSkip}s`}
    </Button>
  );
}
