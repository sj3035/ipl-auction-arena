import { useState } from "react";
import { useAuction } from "@/context/AuctionContext";
import { IPL_TEAMS } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gavel, Users, Plus, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRoom, findRoom, joinRoomDb, getRoomMembers } from "@/hooks/useRoom";

export default function LoginScreen() {
  const { state, dispatch } = useAuction();
  const [name, setName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [takenTeamIds, setTakenTeamIds] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!name.trim() || !selectedTeam) return;
    setLoading(true);
    setJoinError("");

    try {
      const roomCode = state.roomId;
      const dbId = await createRoom(roomCode);
      await joinRoomDb(dbId, name.trim(), selectedTeam);

      dispatch({ type: "SET_ROOM_DB_ID", roomDbId: dbId });
      dispatch({ type: "SET_IS_HOST", isHost: true });
      dispatch({ type: "JOIN_TEAM", teamId: selectedTeam, playerName: name.trim() });
      dispatch({ type: "SET_PHASE", phase: "lobby" });
      toast.success(`Room created! Code: ${roomCode}`);
    } catch (err: any) {
      setJoinError(err?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim() || !selectedTeam || joinRoomId.length < 6) return;
    setLoading(true);
    setJoinError("");

    try {
      const room = await findRoom(joinRoomId.toUpperCase());
      if (!room) {
        setJoinError("Room not found. Check the code and try again.");
        return;
      }

      // Check which teams are taken
      const members = await getRoomMembers(room.id);
      const taken = members.map(m => m.team_id);
      
      if (taken.includes(selectedTeam)) {
        setJoinError("This team is already taken in this room!");
        setTakenTeamIds(taken);
        return;
      }

      await joinRoomDb(room.id, name.trim(), selectedTeam);

      // Sync room state: set room info and join team locally
      dispatch({ type: "SET_ROOM_ID", roomId: room.room_code });
      dispatch({ type: "SET_ROOM_DB_ID", roomDbId: room.id });
      dispatch({ type: "SET_IS_HOST", isHost: false });

      // Apply existing members to local state
      for (const member of members) {
        dispatch({ type: "JOIN_TEAM", teamId: member.team_id, playerName: member.player_name });
      }
      // Join self
      dispatch({ type: "JOIN_TEAM", teamId: selectedTeam, playerName: name.trim() });
      dispatch({ type: "SET_PHASE", phase: "lobby" });
      toast.success(`Joined room ${room.room_code}!`);
    } catch (err: any) {
      setJoinError(err?.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  // When switching to join mode, clear taken teams
  const switchToJoin = () => {
    setMode("join");
    setTakenTeamIds([]);
    setJoinError("");
  };

  // Fetch taken teams when room code is entered
  const handleRoomCodeChange = async (value: string) => {
    const code = value.toUpperCase();
    setJoinRoomId(code);
    setJoinError("");

    if (code.length === 6) {
      const room = await findRoom(code);
      if (room) {
        const members = await getRoomMembers(room.id);
        setTakenTeamIds(members.map(m => m.team_id));
      } else {
        setTakenTeamIds([]);
      }
    } else {
      setTakenTeamIds([]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Gavel className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">IPL AUCTION</h1>
          <p className="text-muted-foreground">Real-Time Multiplayer Simulator</p>
        </div>

        {mode === "select" ? (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Create a new room or join one on any device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setMode("create")} className="w-full h-12" variant="default">
                <Plus className="w-4 h-4 mr-2" /> Create Room
              </Button>
              <Button onClick={switchToJoin} className="w-full h-12" variant="outline">
                <LogIn className="w-4 h-4 mr-2" /> Join Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {mode === "create" ? "Create Room" : "Join Room"}
              </CardTitle>
              <CardDescription>
                {mode === "create"
                  ? `Your Room Code: ${state.roomId}`
                  : "Enter the room code shared by the host"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "join" && (
                <div className="space-y-2">
                  <Label>Room Code</Label>
                  <Input
                    value={joinRoomId}
                    onChange={e => handleRoomCodeChange(e.target.value)}
                    placeholder="Enter 6-character room code"
                    maxLength={6}
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
              )}

              {joinError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {joinError}
                </p>
              )}

              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Team</Label>
                <Select value={selectedTeam} onValueChange={(v) => { setSelectedTeam(v); setJoinError(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your team" />
                  </SelectTrigger>
                  <SelectContent>
                    {IPL_TEAMS.map(t => {
                      const taken = takenTeamIds.includes(t.teamId);
                      return (
                        <SelectItem key={t.teamId} value={t.teamId} disabled={taken}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${t.color})` }} />
                            {t.teamName}
                            {taken && <span className="text-xs text-muted-foreground ml-1">(Taken)</span>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => { setMode("select"); setJoinError(""); }} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={mode === "create" ? handleCreate : handleJoin}
                  disabled={loading || !name.trim() || !selectedTeam || (mode === "join" && joinRoomId.length < 6)}
                  className="flex-1"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === "create" ? "Create & Join" : "Join Room"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
