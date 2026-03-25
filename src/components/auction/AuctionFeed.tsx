import { AuctionLogEntry } from "@/types/auction";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuctionFeedProps {
  log: AuctionLogEntry[];
  compact?: boolean;
}

const typeColors: Record<AuctionLogEntry["type"], string> = {
  info: "text-blue-400",
  bid: "text-yellow-400",
  sold: "text-emerald-400",
  unsold: "text-red-400",
  system: "text-purple-400",
};

export function AuctionFeed({ log, compact }: AuctionFeedProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 sm:px-4 py-2 border-b border-border bg-muted/30">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Feed</h3>
      </div>
      <ScrollArea className={compact ? "h-28" : "h-48"}>
        <div className="p-2 sm:p-3 space-y-1">
          {log.map(entry => (
            <div key={entry.id} className="text-xs sm:text-sm">
              <span className={`${typeColors[entry.type]} font-medium`}>{entry.message}</span>
            </div>
          ))}
          {log.length === 0 && (
            <div className="text-xs sm:text-sm text-muted-foreground italic">Waiting for auction to begin...</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
