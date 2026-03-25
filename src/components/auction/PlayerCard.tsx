import { AuctionPlayer } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import { Star } from "lucide-react";

interface PlayerCardProps {
  player: AuctionPlayer;
  currentBid: number;
  currentBidderName?: string;
  compact?: boolean;
}

export function PlayerCard({ player, currentBid, currentBidderName, compact }: PlayerCardProps) {
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

  if (compact) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground shrink-0">
            {player.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{player.name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${nationalityBadge}`}>
                {player.nationality}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleBadge[player.role] || ""}`}>
                {player.role}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">Base: {formatPrice(player.basePrice)}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < player.rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 mt-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Bid</div>
          <div className="text-2xl font-black text-primary">{formatPrice(currentBid)}</div>
          {currentBidderName && (
            <div className="text-xs text-accent-foreground font-medium">by {currentBidderName}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4 shadow-lg">
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
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm text-muted-foreground">Current Bid</div>
        <div className="text-4xl font-black text-primary mt-1">{formatPrice(currentBid)}</div>
        {currentBidderName && (
          <div className="text-sm mt-1 text-accent-foreground font-medium">by {currentBidderName}</div>
        )}
      </div>
    </div>
  );
}
