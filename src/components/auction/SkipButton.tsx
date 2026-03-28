import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

interface SkipButtonProps {
  isHost: boolean;
  onSkip: () => void;
}

export function SkipButton({ isHost, onSkip }: SkipButtonProps) {
  if (!isHost) return null;

  return (
    <Button
      onClick={onSkip}
      variant="outline"
      size="sm"
      className="w-full text-xs"
    >
      <SkipForward className="w-3 h-3 mr-1" />
      Skip Player
    </Button>
  );
}
