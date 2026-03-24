import { useState } from "react";
import { useAuction } from "@/context/AuctionContext";
import { IPL_TEAMS } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gavel, Users, Plus, LogIn } from "lucide-react";

export default function LoginScreen() {
  const { state, dispatch } = useAuction();
  const [name, setName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");

  const takenTeamIds = state.teams.filter(t => !t.isBot).map(t => t.teamId);

  const handleCreate = () => {
    if (!name.trim() || !selectedTeam) return;
    dispatch({ type: "JOIN_TEAM", teamId: selectedTeam, playerName: name.trim() });
    dispatch({ type: "SET_PHASE", phase: "lobby" });
  };

  const handleJoin = () => {
    if (!name.trim() || !selectedTeam) return;
    if (joinRoomId.toUpperCase() !== state.roomId) {
      // In single-screen mode, we just match the current room
      return;
    }
    dispatch({ type: "JOIN_TEAM", teamId: selectedTeam, playerName: name.trim() });
    dispatch({ type: "SET_PHASE", phase: "lobby" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Gavel className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">IPL AUCTION</h1>
          <p className="text-muted-foreground">Simulator</p>
        </div>

        {mode === "select" ? (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Create a new room or join an existing one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setMode("create")} className="w-full h-12" variant="default">
                <Plus className="w-4 h-4 mr-2" /> Create Room
              </Button>
              <Button onClick={() => setMode("join")} className="w-full h-12" variant="outline">
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
                  ? `Room ID: ${state.roomId}`
                  : "Enter the room ID to join"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "join" && (
                <div className="space-y-2">
                  <Label>Room ID</Label>
                  <Input
                    value={joinRoomId}
                    onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character room ID"
                    maxLength={6}
                    className="font-mono text-lg tracking-widest text-center"
                  />
                </div>
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
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
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
                <Button variant="ghost" onClick={() => setMode("select")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={mode === "create" ? handleCreate : handleJoin}
                  disabled={!name.trim() || !selectedTeam}
                  className="flex-1"
                >
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
