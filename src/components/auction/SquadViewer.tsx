import { TeamSlot } from "@/types/auction";
import { formatPrice } from "@/utils/bidUtils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SquadViewerProps {
  team: TeamSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SquadViewer({ team, open, onOpenChange }: SquadViewerProps) {
  if (!team) return null;

  const overseasCount = team.squad.filter(p => p.nationality === "Overseas").length;
  const totalSpent = team.squad.reduce((sum, p) => sum + (p.soldPrice || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${team.color})` }} />
            {team.teamName}
            {team.isBot && <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">BOT</span>}
          </DialogTitle>
          <DialogDescription>
            Squad: {team.squad.length}/25 • Overseas: {overseasCount}/8 •
            Spent: {formatPrice(totalSpent)} • Remaining: {formatPrice(team.purse)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {team.squad.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No players acquired yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.squad.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.role}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.nationality === "Overseas" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {p.nationality}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.soldPrice || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
