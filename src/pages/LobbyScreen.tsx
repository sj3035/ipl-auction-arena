import { useEffect, useState, useCallback } from "react";
import { useAuction } from "@/context/AuctionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Play, UserMinus, UserPlus, Gavel, Wifi } from "lucide-react";
import { toast } from "sonner";
import { getRoomMembers, leaveRoomDb, subscribeToRoomMembers } from "@/hooks/useRoom";

export default function LobbyScreen() {
  const { state, dispatch } = useAuction();
  const [syncing, setSyncing] = useState(false);
  const humanTeams = state.teams.filter(t => !t.isBot);

  // Sync members from DB on load and on realtime updates
  const syncMembers = useCallback(async () => {
    if (!state.roomDbId) return;
    setSyncing(true);
    try {
      const members = await getRoomMembers(state.roomDbId);
      // Reset all teams to bot first, then apply DB members
      const currentTeamIds = members.map(m => m.team_id);
      
      // For each team, check if they have a member in DB
      for (const team of state.teams) {
        const member = members.find(m => m.team_id === team.teamId);
        if (member && team.isBot) {
          dispatch({ type: "JOIN_TEAM", teamId: team.teamId, playerName: member.player_name });
        } else if (!member && !team.isBot) {
          // Team was removed from DB but still local — revert to bot
          dispatch({ type: "LEAVE_TEAM", teamId: team.teamId });
        }
      }
    } finally {
      setSyncing(false);
    }
  }, [state.roomDbId, state.teams, dispatch]);

  // Subscribe to realtime room_members changes
  useEffect(() => {
    if (!state.roomDbId) return;
    syncMembers();
    const unsubscribe = subscribeToRoomMembers(state.roomDbId, syncMembers);
    return unsubscribe;
  }, [state.roomDbId]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(state.roomId);
    toast.success("Room code copied! Share it with friends to join from any device.");
  };

  const startAuction = () => {
    dispatch({ type: "START_AUCTION" });
  };

  const removePlayer = async (teamId: string) => {
    if (state.roomDbId) {
      try {
        await leaveRoomDb(state.roomDbId, teamId);
      } catch {}
    }
    dispatch({ type: "LEAVE_TEAM", teamId });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Gavel className="w-8 h-8 mx-auto text-primary" />
          <h1 className="text-3xl font-black text-foreground">AUCTION LOBBY</h1>
          <p className="text-sm text-muted-foreground">
            Share the room code — players can join from any device!
          </p>
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
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Wifi className="w-3 h-3" />
            {state.isHost ? "You are the host" : "Connected to room"}
            {syncing && " • Syncing..."}
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
                      {state.isHost && (
                        <button
                          onClick={() => removePlayer(team.teamId)}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {state.isHost && (
            <Button
              onClick={startAuction}
              disabled={humanTeams.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Auction
            </Button>
          )}
          {!state.isHost && (
            <p className="text-sm text-center text-muted-foreground w-full">
              Waiting for host to start the auction...
            </p>
          )}
        </div>

        {humanTeams.length === 0 && state.isHost && (
          <p className="text-xs text-center text-muted-foreground">
            At least 1 human player is required to start the auction
          </p>
        )}
      </div>
    </div>
  );
}
