import { useAuction } from "@/context/AuctionContext";
import { formatPrice } from "@/utils/bidUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, RotateCcw, Users, Globe, Wallet } from "lucide-react";
import { useState } from "react";
import { SquadViewer } from "@/components/auction/SquadViewer";

export default function EndScreen() {
  const { state, dispatch } = useAuction();
  const [viewSquadTeamId, setViewSquadTeamId] = useState<string | null>(null);
  const viewSquadTeam = state.teams.find(t => t.teamId === viewSquadTeamId) || null;

  const sortedTeams = [...state.teams].sort((a, b) => b.squad.length - a.squad.length);

  const handlePlayAgain = () => {
    dispatch({ type: "RESET_GAME" });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Trophy className="w-12 h-12 mx-auto text-yellow-400" />
          <h1 className="text-4xl font-black text-foreground">AUCTION COMPLETE</h1>
          <p className="text-muted-foreground">Here's the final summary of all teams</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Team Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center"><Users className="w-4 h-4 inline" /> Squad</TableHead>
                    <TableHead className="text-center"><Globe className="w-4 h-4 inline" /> Overseas</TableHead>
                    <TableHead className="text-right"><Wallet className="w-4 h-4 inline" /> Spent</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-center">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTeams.map(team => {
                    const totalSpent = team.squad.reduce((s, p) => s + (p.soldPrice || 0), 0);
                    const overseas = team.squad.filter(p => p.nationality === "Overseas").length;

                    return (
                      <TableRow key={team.teamId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${team.color})` }} />
                            <span className="font-bold">{team.shortName}</span>
                            {team.isBot && <span className="text-[10px] text-muted-foreground">🤖</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{team.squad.length}</TableCell>
                        <TableCell className="text-center">{overseas}/8</TableCell>
                        <TableCell className="text-right font-semibold">{formatPrice(totalSpent)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatPrice(team.purse)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewSquadTeamId(team.teamId)}
                          >
                            View Squad
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={handlePlayAgain} size="lg" className="h-12 px-8">
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
        </div>
      </div>

      <SquadViewer
        team={viewSquadTeam}
        open={!!viewSquadTeamId}
        onOpenChange={open => !open && setViewSquadTeamId(null)}
      />
    </div>
  );
}
