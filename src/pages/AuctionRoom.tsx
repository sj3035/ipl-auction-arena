import { useState, useCallback } from "react";
import { useAuction } from "@/context/AuctionContext";
import { PlayerCard } from "@/components/auction/PlayerCard";
import { TeamPanel } from "@/components/auction/TeamPanel";
import { AuctionFeed } from "@/components/auction/AuctionFeed";
import { PlayerPool } from "@/components/auction/PlayerPool";
import { CountdownTimer } from "@/components/auction/CountdownTimer";
import { BidButton } from "@/components/auction/BidButton";
import { SquadViewer } from "@/components/auction/SquadViewer";
import { canTeamBid } from "@/utils/bidUtils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Gavel } from "lucide-react";

export default function AuctionRoom() {
  const { state, dispatch, getHumanTeams, getActiveHumanTeam } = useAuction();
  const [viewSquadTeamId, setViewSquadTeamId] = useState<string | null>(null);

  const humanTeams = getHumanTeams();
  const activeTeam = getActiveHumanTeam();
  const viewSquadTeam = state.teams.find(t => t.teamId === viewSquadTeamId) || null;

  const currentBidderTeam = state.teams.find(t => t.teamId === state.currentBidder);

  const handleBid = useCallback(() => {
    if (!activeTeam || !state.currentPlayer) return;
    const { canBid } = canTeamBid(activeTeam, state.currentBid, state.currentBidder, state.currentPlayer);
    if (!canBid) return;
    dispatch({ type: "PLACE_BID", teamId: activeTeam.teamId });
  }, [activeTeam, state.currentPlayer, state.currentBid, state.currentBidder, dispatch]);

  const switchHuman = (dir: number) => {
    const newIdx = (state.activeHumanTeamIndex + dir + humanTeams.length) % humanTeams.length;
    dispatch({ type: "SET_ACTIVE_HUMAN", index: newIdx });
  };

  const categoryLabel = state.isMiniBidRound
    ? "Mini-Auction Round"
    : `Round: ${state.poolCategoryOrder[state.currentCategoryIndex] || "Complete"}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">IPL AUCTION</span>
          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{categoryLabel}</span>
        </div>
        {humanTeams.length > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => switchHuman(-1)} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {activeTeam?.playerName} ({activeTeam?.shortName})
            </span>
            <Button variant="ghost" size="icon" onClick={() => switchHuman(1)} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        {humanTeams.length === 1 && activeTeam && (
          <span className="text-sm font-medium text-foreground">
            👤 {activeTeam.playerName} ({activeTeam.shortName})
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Player Pool */}
        <div className="w-64 border-r border-border p-3 hidden lg:block overflow-hidden">
          <PlayerPool players={state.playerPool} currentPlayerId={state.currentPlayer?.id} />
        </div>

        {/* Center - Auction Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {state.currentPlayer ? (
            <>
              <div className="max-w-md mx-auto w-full">
                <PlayerCard
                  player={state.currentPlayer}
                  currentBid={state.currentBid}
                  currentBidderName={currentBidderTeam?.shortName}
                />
              </div>

              <div className="max-w-md mx-auto w-full">
                <CountdownTimer timer={state.timer} />
              </div>

              {activeTeam && (
                <div className="max-w-md mx-auto w-full">
                  <BidButton
                    team={activeTeam}
                    currentBid={state.currentBid}
                    currentBidder={state.currentBidder}
                    currentPlayer={state.currentPlayer}
                    onBid={handleBid}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Preparing next player...
            </div>
          )}

          {/* Auction Feed */}
          <div className="mt-auto">
            <AuctionFeed log={state.auctionLog} />
          </div>
        </div>

        {/* Right Panel - Teams */}
        <div className="w-60 border-l border-border p-3 overflow-y-auto hidden md:block">
          <TeamPanel
            teams={state.teams}
            currentBidder={state.currentBidder}
            onViewSquad={setViewSquadTeamId}
          />
        </div>
      </div>

      {/* Squad Viewer Modal */}
      <SquadViewer
        team={viewSquadTeam}
        open={!!viewSquadTeamId}
        onOpenChange={open => !open && setViewSquadTeamId(null)}
      />
    </div>
  );
}
