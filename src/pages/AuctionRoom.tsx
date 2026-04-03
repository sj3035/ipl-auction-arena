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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Gavel, Users, ListOrdered, MessageSquare } from "lucide-react";

type MobileTab = "auction" | "players" | "teams" | "feed";

export default function AuctionRoom() {
  const { state, dispatch, getHumanTeams, getActiveHumanTeam, sendAction } = useAuction();
  const [viewSquadTeamId, setViewSquadTeamId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("auction");

  const humanTeams = getHumanTeams();
  const activeTeam = getActiveHumanTeam();
  const viewSquadTeam = state.teams.find(t => t.teamId === viewSquadTeamId) || null;
  const currentBidderTeam = state.teams.find(t => t.teamId === state.currentBidder);

  const handleBid = useCallback(() => {
    if (!activeTeam || !state.currentPlayer) return;
    const { canBid } = canTeamBid(activeTeam, state.currentBid, state.currentBidder, state.currentPlayer);
    if (!canBid) return;
    sendAction({ type: "PLACE_BID", teamId: activeTeam.teamId });
  }, [activeTeam, state.currentPlayer, state.currentBid, state.currentBidder, sendAction]);

  const switchHuman = (dir: number) => {
    const newIdx = (state.activeHumanTeamIndex + dir + humanTeams.length) % humanTeams.length;
    dispatch({ type: "SET_ACTIVE_HUMAN", index: newIdx });
  };

  const categoryLabel = state.isMarqueeRound
    ? "⭐ Marquee Round"
    : state.isMiniBidRound
      ? "Mini-Auction Round"
      : `Round: ${state.poolCategoryOrder[state.currentCategoryIndex] || "Complete"}`;

  const mobileTabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    { id: "auction", label: "Auction", icon: <Gavel className="w-4 h-4" /> },
    { id: "players", label: "Players", icon: <ListOrdered className="w-4 h-4" /> },
    { id: "teams", label: "Teams", icon: <Users className="w-4 h-4" /> },
    { id: "feed", label: "Feed", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
          <span className="font-bold text-foreground text-sm sm:text-base hidden sm:inline">IPL AUCTION</span>
          <span className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-muted-foreground truncate max-w-[140px] sm:max-w-none">
            {categoryLabel}
          </span>
        </div>
        {humanTeams.length > 1 && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={() => switchHuman(-1)} className="h-7 w-7 sm:h-8 sm:w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
              {activeTeam?.playerName} ({activeTeam?.shortName})
            </span>
            <Button variant="ghost" size="icon" onClick={() => switchHuman(1)} className="h-7 w-7 sm:h-8 sm:w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        {humanTeams.length === 1 && activeTeam && (
          <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
            👤 {activeTeam.playerName} ({activeTeam.shortName})
          </span>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left Panel - Player Pool */}
        <div className="w-64 border-r border-border p-3 hidden lg:block overflow-hidden">
          <PlayerPool players={state.playerPool} currentPlayerId={state.currentPlayer?.id} />
        </div>

        {/* Center - Scrollable Auction Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
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
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  Preparing next player...
                </div>
              )}
              {/* Live Feed below bidding area */}
              <div className="max-w-lg mx-auto w-full">
                <AuctionFeed log={state.auctionLog} />
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Teams */}
        <div className="w-60 border-l border-border p-3 overflow-y-auto">
          <TeamPanel teams={state.teams} currentBidder={state.currentBidder} onViewSquad={setViewSquadTeamId} />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        <ScrollArea className="flex-1">
          {mobileTab === "auction" && (
            <div className="p-3 space-y-3">
              {state.currentPlayer ? (
                <>
                  <PlayerCard
                    player={state.currentPlayer}
                    currentBid={state.currentBid}
                    currentBidderName={currentBidderTeam?.shortName}
                    compact
                  />
                  <CountdownTimer timer={state.timer} />
                  {activeTeam && (
                    <BidButton
                      team={activeTeam}
                      currentBid={state.currentBid}
                      currentBidder={state.currentBidder}
                      currentPlayer={state.currentPlayer}
                      onBid={handleBid}
                    />
                  )}
                  <AuctionFeed log={state.auctionLog} compact />
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  Preparing next player...
                </div>
              )}
            </div>
          )}

          {mobileTab === "players" && (
            <div className="p-3">
              <PlayerPool players={state.playerPool} currentPlayerId={state.currentPlayer?.id} mobile />
            </div>
          )}

          {mobileTab === "teams" && (
            <div className="p-3">
              <TeamPanel teams={state.teams} currentBidder={state.currentBidder} onViewSquad={setViewSquadTeamId} />
            </div>
          )}

          {mobileTab === "feed" && (
            <div className="p-3">
              <AuctionFeed log={state.auctionLog} />
            </div>
          )}
        </ScrollArea>

        {/* Mobile Bottom Tab Bar */}
        <div className="border-t border-border bg-card grid grid-cols-4 shrink-0">
          {mobileTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                mobileTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
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
