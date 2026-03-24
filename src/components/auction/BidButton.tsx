import { Button } from "@/components/ui/button";
import { TeamSlot, AuctionPlayer } from "@/types/auction";
import { canTeamBid, formatPrice, getBidIncrement } from "@/utils/bidUtils";
import { Gavel } from "lucide-react";

interface BidButtonProps {
  team: TeamSlot;
  currentBid: number;
  currentBidder: string | null;
  currentPlayer: AuctionPlayer | null;
  onBid: () => void;
}

export function BidButton({ team, currentBid, currentBidder, currentPlayer, onBid }: BidButtonProps) {
  const { canBid, reason } = canTeamBid(team, currentBid, currentBidder, currentPlayer);
  const nextBid = currentBidder === null ? currentBid : currentBid + getBidIncrement(currentBid);

  return (
    <div className="space-y-2">
      <Button
        onClick={onBid}
        disabled={!canBid}
        size="lg"
        className={`w-full h-16 text-lg font-bold ${
          canBid
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Gavel className="w-5 h-5 mr-2" />
        {canBid ? `BID ${formatPrice(nextBid)}` : "Cannot Bid"}
      </Button>
      {!canBid && reason && (
        <p className="text-xs text-center text-muted-foreground">{reason}</p>
      )}
      <div className="text-xs text-center text-muted-foreground">
        Playing as <span className="font-bold text-foreground">{team.shortName}</span> • Purse: {formatPrice(team.purse)}
      </div>
    </div>
  );
}
