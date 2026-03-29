import { TeamSlot } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import { Users, Globe, Lock } from "lucide-react";

interface TeamPanelProps {
  teams: TeamSlot[];
  currentBidder: string | null;
  onViewSquad: (teamId: string) => void;
}

export function TeamPanel({ teams, currentBidder, onViewSquad }: TeamPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Teams</h3>
      {teams.map(team => {
        const overseasCount = team.squad.filter(p => p.nationality === "Overseas").length;
        const isLeading = currentBidder === team.teamId;

        return (
          <button
            key={team.teamId}
            onClick={() => onViewSquad(team.teamId)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isLeading
                ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: `hsl(${team.color})` }}
                />
                <span className="font-bold text-sm text-foreground">{team.shortName}</span>
                {team.isBot && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">BOT</span>
                )}
                {isLeading && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">LEADING</span>
                )}
              </div>
              <span className="text-xs font-semibold text-foreground">{formatPrice(team.purse)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{team.squad.length}/25</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{overseasCount}/8</span>
              {team.retainedPlayers.length > 0 && (
                <span className="flex items-center gap-1 text-yellow-400"><Lock className="w-3 h-3" />{team.retainedPlayers.length} RTM</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
