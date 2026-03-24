import { AuctionPlayer } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import { Star } from "lucide-react";

interface PlayerCardProps {
  player: AuctionPlayer;
  currentBid: number;
  currentBidderName?: string;
}

export function PlayerCard({ player, currentBid, currentBidderName }: PlayerCardProps) {
  const nationalityBadge = player.nationality === "Overseas"
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  const roleBadge: Record<string, string> = {
    "Batter": "bg-blue-500/20 text-blue-300",
    "WK": "bg-purple-500/20 text-purple-300",
    "All-rounder": "bg-cyan-500/20 text-cyan-300",
    "Spinner": "bg-pink-500/20 text-pink-300",
    "Fast Bowler": "bg-red-500/20 text-red-300",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4 shadow-lg">
      {/* Player Avatar Placeholder */}
      <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
        {player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">{player.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${nationalityBadge}`}>
            {player.nationality}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${roleBadge[player.role] || ""}`}>
            {player.role}
          </span>
        </div>
      </div>

      {/* Rating Stars */}
      <div className="flex items-center justify-center gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < player.rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
          />
        ))}
      </div>

      <div className="text-sm text-muted-foreground">
        Base Price: <span className="text-foreground font-semibold">{formatPrice(player.basePrice)}</span>
      </div>

      {/* Current Bid */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Current Bid</div>
        <div className="text-4xl font-black text-primary mt-1">{formatPrice(currentBid)}</div>
        {currentBidderName && (
          <div className="text-sm mt-1 text-accent-foreground font-medium">
            by {currentBidderName}
          </div>
        )}
      </div>
    </div>
  );
}
