import { useEffect, useState, useCallback } from "react";
import { useAuction } from "@/context/AuctionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Play, UserMinus, Gavel, Wifi, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import { getRoomMembers, leaveRoomDb, subscribeToRoomMembers } from "@/hooks/useRoom";
import { PREVIOUS_YEAR_ROSTERS, RETENTION_COSTS, MAX_RETENTIONS } from "@/data/retentions";
import { formatPrice } from "@/utils/bidUtils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LobbyScreen() {
  const { state, dispatch } = useAuction();
  const [syncing, setSyncing] = useState(false);
  const humanTeams = state.teams.filter(t => !t.isBot);

  const syncMembers = useCallback(async () => {
    if (!state.roomDbId) return;
    setSyncing(true);
    try {
      const members = await getRoomMembers(state.roomDbId);
      for (const team of state.teams) {
        const member = members.find(m => m.team_id === team.teamId);
        if (member && team.isBot) {
          dispatch({ type: "JOIN_TEAM", teamId: team.teamId, playerName: member.player_name });
        } else if (!member && !team.isBot) {
          dispatch({ type: "LEAVE_TEAM", teamId: team.teamId });
        }
      }
    } finally {
      setSyncing(false);
    }
  }, [state.roomDbId, state.teams, dispatch]);

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
    // Auto-retain for bots first
    dispatch({ type: "AUTO_RETAIN_BOTS" });
    // Small delay then start auction
    setTimeout(() => {
      dispatch({ type: "START_AUCTION" });
    }, 500);
  };

  const removePlayer = async (teamId: string) => {
    if (state.roomDbId) {
      try {
        await leaveRoomDb(state.roomDbId, teamId);
      } catch {}
    }
    dispatch({ type: "LEAVE_TEAM", teamId });
  };

  // Get retention-eligible players for a human team
  const getRetentionOptions = (teamId: string) => {
    const roster = PREVIOUS_YEAR_ROSTERS[teamId] || [];
    return roster
      .map(pid => state.playerPool.find(p => p.id === pid && p.status === "upcoming"))
      .filter(Boolean);
  };

  const handleRetain = (teamId: string, playerId: string) => {
    dispatch({ type: "RETAIN_PLAYER", teamId, playerId });
    const player = state.playerPool.find(p => p.id === playerId);
    if (player) {
      toast.success(`${player.name} retained!`);
    }
  };

  // Current human team being viewed for retention
  const myTeam = state.teams.find(t => !t.isBot);
  const myRetentionOptions = myTeam ? getRetentionOptions(myTeam.teamId) : [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
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
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-2">
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
                        {team.retainedPlayers.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {team.retainedPlayers.map(p => (
                              <span key={p.id} className="text-[10px] bg-yellow-400/15 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-400/30 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                {p.name}
                              </span>
                            ))}
                          </div>
                        )}
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
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* RTM Retention Section for human teams */}
        {myTeam && !myTeam.isBot && (
          <Card className="bg-card border-yellow-400/30">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                RTM — Retain Players ({myTeam.retainedPlayers.length}/{MAX_RETENTIONS})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Retain up to 3 players from last year. Cost: 18 Cr → 15 Cr → 13 Cr
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {myRetentionOptions.length === 0 && myTeam.retainedPlayers.length === 0 && (
                <p className="text-xs text-muted-foreground">No players available for retention.</p>
              )}
              {myTeam.retainedPlayers.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.role}</span>
                  </div>
                  <span className="text-xs font-bold text-yellow-400">{formatPrice(RETENTION_COSTS[i])}</span>
                </div>
              ))}
              {myTeam.retainedPlayers.length < MAX_RETENTIONS && myRetentionOptions.map(p => {
                if (!p) return null;
                const cost = RETENTION_COSTS[myTeam.retainedPlayers.length];
                return (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border hover:border-yellow-400/30 transition">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.role}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: p.rating }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                      onClick={() => handleRetain(myTeam.teamId, p.id)}
                    >
                      <Lock className="w-3 h-3 mr-1" />
                      Retain ({formatPrice(cost)})
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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
