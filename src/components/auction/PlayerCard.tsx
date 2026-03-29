import { AuctionPlayer } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import { Star, Crown } from "lucide-react";

interface PlayerCardProps {
  player: AuctionPlayer;
  currentBid: number;
  currentBidderName?: string;
  compact?: boolean;
}

const MARQUEE_RATING = 10;

export function PlayerCard({ player, currentBid, currentBidderName, compact }: PlayerCardProps) {
  const isMarquee = player.rating >= MARQUEE_RATING;
  
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

  const marqueeGlow = isMarquee
    ? "ring-2 ring-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
    : "";

  const marqueeBorder = isMarquee
    ? "border-yellow-400/50"
    : "border-border";

  if (compact) {
    return (
      <div className={`bg-card border ${marqueeBorder} rounded-xl p-3 shadow-lg ${marqueeGlow}`}>
        {isMarquee && (
          <div className="flex items-center justify-center gap-1 mb-2">
            <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">
              Marquee Player
            </span>
            <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
            isMarquee ? "bg-yellow-400/20 text-yellow-300 ring-2 ring-yellow-400/40" : "bg-muted text-muted-foreground"
          }`}>
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
        <div className={`rounded-lg p-3 mt-3 text-center ${
          isMarquee ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-muted/50"
        }`}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Bid</div>
          <div className={`text-2xl font-black ${isMarquee ? "text-yellow-400" : "text-primary"}`}>{formatPrice(currentBid)}</div>
          {currentBidderName && (
            <div className="text-xs text-accent-foreground font-medium">by {currentBidderName}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border ${marqueeBorder} rounded-xl p-6 text-center space-y-4 shadow-lg ${marqueeGlow}`}>
      {isMarquee && (
        <div className="flex items-center justify-center gap-1.5">
          <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
            Marquee Player
          </span>
          <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        </div>
      )}
      <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
        isMarquee ? "bg-yellow-400/20 text-yellow-300 ring-2 ring-yellow-400/40" : "bg-muted text-muted-foreground"
      }`}>
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
      <div className={`rounded-lg p-4 ${isMarquee ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-muted/50"}`}>
        <div className="text-sm text-muted-foreground">Current Bid</div>
        <div className={`text-4xl font-black mt-1 ${isMarquee ? "text-yellow-400" : "text-primary"}`}>{formatPrice(currentBid)}</div>
        {currentBidderName && (
          <div className="text-sm mt-1 text-accent-foreground font-medium">by {currentBidderName}</div>
        )}
      </div>
    </div>
  );
}
