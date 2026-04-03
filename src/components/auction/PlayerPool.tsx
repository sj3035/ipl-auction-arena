import { AuctionPlayer } from "@/types/auction";
import { PLAYER_CAPPED_STATUS } from "@/data/retentions";
import { formatPrice } from "@/utils/bidUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PlayerPoolProps {
  players: AuctionPlayer[];
  currentPlayerId?: string;
  mobile?: boolean;
}

const MARQUEE_RATING = 10;

function isPlayerCapped(p: AuctionPlayer): boolean {
  return PLAYER_CAPPED_STATUS[p.id] !== false;
}

// Desktop/tablet: full labels. Mobile: short labels.
const categories = [
  { label: "All", shortLabel: "All", value: "All" },
  { label: "⭐ Marquee", shortLabel: "⭐", value: "Marquee" },
  { label: "C-Bat", shortLabel: "CB", value: "Capped-Batter" },
  { label: "C-WK", shortLabel: "CW", value: "Capped-WK" },
  { label: "C-AR", shortLabel: "CA", value: "Capped-AR" },
  { label: "C-Spin", shortLabel: "CS", value: "Capped-Spinner" },
  { label: "C-Pace", shortLabel: "CP", value: "Capped-Pacer" },
  { label: "U-Bat", shortLabel: "UB", value: "Uncapped-Batter" },
  { label: "U-WK", shortLabel: "UW", value: "Uncapped-WK" },
  { label: "U-AR", shortLabel: "UA", value: "Uncapped-AR" },
  { label: "U-Spin", shortLabel: "US", value: "Uncapped-Spinner" },
  { label: "U-Pace", shortLabel: "UP", value: "Uncapped-Pacer" },
];

const statusColors: Record<string, string> = {
  upcoming: "bg-muted text-muted-foreground",
  sold: "bg-emerald-500/20 text-emerald-400",
  unsold: "bg-red-500/20 text-red-400",
};

function filterPlayers(players: AuctionPlayer[], category: string): AuctionPlayer[] {
  if (category === "All") return players;
  if (category === "Marquee") return players.filter(p => p.rating >= MARQUEE_RATING);

  const [cappedStr, role] = category.split("-");
  const capped = cappedStr === "Capped";
  const roleMap: Record<string, string> = {
    Batter: "Batter",
    WK: "WK",
    AR: "All-rounder",
    Spinner: "Spinner",
    Pacer: "Fast Bowler",
  };
  const actualRole = roleMap[role] || role;
  return players.filter(
    p => p.role === actualRole && p.rating < MARQUEE_RATING && isPlayerCapped(p) === capped
  );
}

export function PlayerPool({ players, currentPlayerId, mobile }: PlayerPoolProps) {
  const scrollHeight = mobile ? "h-[calc(100dvh-220px)]" : "h-[calc(100vh-460px)]";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-muted/30">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Player Pool</h3>
      </div>
      <Tabs defaultValue="All" className="p-2">
        {/* Scrollable tab list for many categories */}
        <ScrollArea className="w-full">
          <TabsList className={`inline-flex w-auto gap-0.5 h-auto flex-wrap ${mobile ? "grid grid-cols-6 w-full" : ""}`}>
            {categories.map(c => (
              <TabsTrigger key={c.value} value={c.value} className="text-[9px] sm:text-[10px] lg:text-xs px-1.5 py-1 whitespace-nowrap">
                {mobile ? c.shortLabel : c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>
        {categories.map(c => (
          <TabsContent key={c.value} value={c.value} className="mt-2">
            <ScrollArea className={scrollHeight}>
              <div className={mobile ? "grid grid-cols-2 gap-1 pr-2" : "space-y-1 pr-2"}>
                {filterPlayers(players, c.value).map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2 sm:px-3 py-1.5 rounded text-xs ${
                      p.id === currentPlayerId
                        ? "bg-primary/20 border border-primary/40"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-foreground truncate">{p.name}</span>
                      {p.nationality === "Overseas" && (
                        <span className="text-[10px] text-amber-400 shrink-0">OS</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-muted-foreground text-[10px] sm:text-xs">{formatPrice(p.basePrice)}</span>
                      <span className={`text-[10px] px-1 sm:px-1.5 py-0.5 rounded ${statusColors[p.status]}`}>
                        {p.status === "sold" ? "SOLD" : p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                {filterPlayers(players, c.value).length === 0 && (
                  <div className="text-center text-muted-foreground text-xs py-4">No players in this category</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
