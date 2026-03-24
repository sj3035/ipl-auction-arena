import { AuctionPlayer, PlayerRole } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PlayerPoolProps {
  players: AuctionPlayer[];
  currentPlayerId?: string;
}

const categories: Array<{ label: string; value: string }> = [
  { label: "All", value: "All" },
  { label: "Batters", value: "Batter" },
  { label: "WK", value: "WK" },
  { label: "AR", value: "All-rounder" },
  { label: "Spin", value: "Spinner" },
  { label: "Fast", value: "Fast Bowler" },
];

const statusColors: Record<string, string> = {
  upcoming: "bg-muted text-muted-foreground",
  sold: "bg-emerald-500/20 text-emerald-400",
  unsold: "bg-red-500/20 text-red-400",
};

export function PlayerPool({ players, currentPlayerId }: PlayerPoolProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Player Pool</h3>
      </div>
      <Tabs defaultValue="All" className="p-2">
        <TabsList className="w-full grid grid-cols-6 h-8">
          {categories.map(c => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs px-1">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map(c => (
          <TabsContent key={c.value} value={c.value} className="mt-2">
            <ScrollArea className="h-[calc(100vh-420px)]">
              <div className="space-y-1 pr-2">
                {players
                  .filter(p => c.value === "All" || p.role === c.value)
                  .map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                        p.id === currentPlayerId
                          ? "bg-primary/20 border border-primary/40"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-foreground truncate">{p.name}</span>
                        {p.nationality === "Overseas" && (
                          <span className="text-[10px] text-amber-400">OS</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">{formatPrice(p.basePrice)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[p.status]}`}>
                          {p.status === "sold" && p.soldTo
                            ? `SOLD`
                            : p.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
