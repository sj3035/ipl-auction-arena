import { useAuction } from "@/context/AuctionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Play, UserMinus, UserPlus, Gavel } from "lucide-react";
import { toast } from "sonner";

export default function LobbyScreen() {
  const { state, dispatch } = useAuction();
  const humanTeams = state.teams.filter(t => !t.isBot);

  const copyRoomId = () => {
    navigator.clipboard.writeText(state.roomId);
    toast.success("Room ID copied! Share it with others to join.");
  };

  const addPlayer = () => {
    dispatch({ type: "SET_PHASE", phase: "login" });
  };

  const startAuction = () => {
    dispatch({ type: "START_AUCTION" });
  };

  const removePlayer = (teamId: string) => {
    dispatch({ type: "LEAVE_TEAM", teamId });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Gavel className="w-8 h-8 mx-auto text-primary" />
          <h1 className="text-3xl font-black text-foreground">AUCTION LOBBY</h1>
          <p className="text-sm text-muted-foreground">Share the Room ID below for others to join</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground text-sm">Room:</span>
            <button
              onClick={copyRoomId}
              className="flex items-center gap-1 bg-muted px-3 py-1 rounded-lg font-mono text-lg tracking-widest text-foreground hover:bg-muted/80 transition"
            >
              {state.roomId}
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Team Slots ({humanTeams.length} players / {state.teams.length} teams)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.teams.map(team => (
              <div
                key={team.teamId}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  team.isBot ? "border-border bg-muted/20" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${team.color})` }} />
                  <div>
                    <div className="font-bold text-sm text-foreground">{team.shortName}</div>
                    <div className="text-xs text-muted-foreground">{team.teamName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {team.isBot ? (
                    <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">🤖 BOT</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded font-medium">
                        👤 {team.playerName}
                      </span>
                      <button
                        onClick={() => removePlayer(team.teamId)}
                        className="text-muted-foreground hover:text-destructive transition"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={addPlayer} variant="outline" className="flex-1">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Player (Hot-Seat)
          </Button>
          <Button
            onClick={startAuction}
            disabled={humanTeams.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Auction
          </Button>
        </div>

        {humanTeams.length === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            At least 1 human player is required to start the auction
          </p>
        )}
      </div>
    </div>
  );
}
