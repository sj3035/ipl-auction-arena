import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  GameState, GameAction, GamePhase, AuctionPlayer, TeamSlot, AuctionLogEntry, PlayerRole, BotStrategy
} from "@/types/auction";
import { playerPool } from "@/data/players";
import { IPL_TEAMS, INITIAL_PURSE, TIMER_DURATION } from "@/data/teams";
import { getBidIncrement, generateRoomId, generateLogId, formatPrice } from "@/utils/bidUtils";
import { getBotBidders } from "@/utils/botLogic";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/hooks/useSessionId";

const BOT_STRATEGIES: BotStrategy[] = ["aggressive", "balanced", "budget", "specialist"];
const POOL_ORDER: PlayerRole[] = ["Batter", "WK", "All-rounder", "Spinner", "Fast Bowler"];
export const AUTO_SKIP_SECONDS = 8;
const BATCH_SIZE = 10;
const MARQUEE_RATING = 10;

function createInitialTeams(): TeamSlot[] {
  return IPL_TEAMS.map(t => ({
    ...t,
    playerName: null,
    isBot: true,
    botStrategy: BOT_STRATEGIES[Math.floor(Math.random() * BOT_STRATEGIES.length)],
    purse: INITIAL_PURSE,
    squad: [],
  }));
}

function createInitialPool(): AuctionPlayer[] {
  return playerPool.map(p => ({ ...p, status: "upcoming" as const }));
}

function addLog(state: GameState, message: string, type: AuctionLogEntry["type"]): AuctionLogEntry[] {
  const entry: AuctionLogEntry = { id: generateLogId(), message, type, timestamp: Date.now() };
  return [entry, ...state.auctionLog].slice(0, 200);
}

function getNextPlayerFromPool(state: GameState): AuctionPlayer | null {
  const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;

  if (state.isMarqueeRound) {
    // Marquee: all 10-star players regardless of role
    const marquee = pool.filter(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
    if (marquee.length === 0) return null;
    return marquee[Math.floor(Math.random() * marquee.length)];
  }

  const category = POOL_ORDER[state.currentCategoryIndex];
  if (!category) return null;

  // Non-marquee players only (rating < 10)
  const available = pool.filter(p => p.status === "upcoming" && p.role === category && p.rating < MARQUEE_RATING);
  if (available.length === 0) return null;

  return available[Math.floor(Math.random() * available.length)];
}

function advanceCategory(state: GameState): Partial<GameState> {
  const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;

  // If marquee round, check if marquee players remain
  if (state.isMarqueeRound) {
    const marqueeLeft = pool.filter(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
    if (marqueeLeft.length > 0) return {}; // stay in marquee
    // Marquee done, move to category rounds
    return {
      isMarqueeRound: false,
      currentCategoryIndex: 0,
      categoryBatchIndex: 0,
      auctionLog: addLog(state, "🏏 Marquee round complete! Moving to category rounds.", "system"),
    };
  }

  // Category batch logic: serve BATCH_SIZE per category, then rotate
  const category = POOL_ORDER[state.currentCategoryIndex];
  const availableInCat = pool.filter(p => p.status === "upcoming" && p.role === category && p.rating < MARQUEE_RATING);
  
  // If current category still has players and we haven't exhausted the batch, stay
  if (availableInCat.length > 0 && state.categoryBatchIndex < BATCH_SIZE) {
    return {};
  }

  // Move to next category with available players
  let nextIdx = (state.currentCategoryIndex + 1) % POOL_ORDER.length;
  let checked = 0;
  while (checked < POOL_ORDER.length) {
    const cat = POOL_ORDER[nextIdx];
    const available = pool.filter(p => p.status === "upcoming" && p.role === cat && p.rating < MARQUEE_RATING);
    if (available.length > 0) break;
    nextIdx = (nextIdx + 1) % POOL_ORDER.length;
    checked++;
  }

  if (checked >= POOL_ORDER.length) {
    // All categories exhausted
    if (!state.isMiniBidRound && state.unsoldPlayers.length > 0) {
      const teamsNeedPlayers = state.teams.some(t => t.squad.length < 18);
      if (teamsNeedPlayers) {
        return {
          currentCategoryIndex: 0,
          categoryBatchIndex: 0,
          isMiniBidRound: true,
          isMarqueeRound: false,
          auctionLog: addLog(state, "🔄 Mini-auction round begins! Unsold players return to the pool.", "system"),
        };
      }
    }
    return { phase: "end" as GamePhase };
  }

  return {
    currentCategoryIndex: nextIdx,
    categoryBatchIndex: 0,
    auctionLog: addLog(state, `📋 Now auctioning: ${POOL_ORDER[nextIdx]}s`, "system"),
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_ROOM_ID":
      return { ...state, roomId: action.roomId };

    case "SET_ROOM_DB_ID":
      return { ...state, roomDbId: action.roomDbId };

    case "SET_IS_HOST":
      return { ...state, isHost: action.isHost };

    case "SYNC_STATE": {
      // Merge received state from host broadcast (joiners only)
      return { ...state, ...action.state };
    }

    case "JOIN_TEAM": {
      const teams = state.teams.map(t =>
        t.teamId === action.teamId
          ? { ...t, playerName: action.playerName, isBot: false, botStrategy: undefined }
          : t
      );
      return { ...state, teams };
    }

    case "LEAVE_TEAM": {
      const teams = state.teams.map(t =>
        t.teamId === action.teamId
          ? { ...t, playerName: null, isBot: true, botStrategy: BOT_STRATEGIES[Math.floor(Math.random() * 4)] }
          : t
      );
      return { ...state, teams };
    }

    case "START_AUCTION": {
      const pool = [...state.playerPool].sort(() => Math.random() - 0.5);
      // Start with marquee players (rating 10)
      const marqueeFirst = pool.find(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
      const firstPlayer = marqueeFirst || pool.find(p => p.status === "upcoming");
      
      if (!firstPlayer) return state;

      const isMarquee = !!marqueeFirst;
      const log = addLog(
        { ...state, auctionLog: [] },
        isMarquee ? `⭐ IPL Auction begins! MARQUEE ROUND - Elite players first!` : `🏏 IPL Auction begins! First category: ${POOL_ORDER[0]}s`,
        "system"
      );
      const log2: AuctionLogEntry = {
        id: generateLogId(),
        message: `📢 ${firstPlayer.name} is up for auction! Base price: ${formatPrice(firstPlayer.basePrice)} | Role: ${firstPlayer.role} | ${firstPlayer.nationality}`,
        type: "info",
        timestamp: Date.now(),
      };

      return {
        ...state,
        phase: "auction",
        playerPool: pool,
        currentPlayer: firstPlayer,
        currentBid: firstPlayer.basePrice,
        currentBidder: null,
        timer: TIMER_DURATION,
        auctionLog: [log2, ...log],
        currentCategoryIndex: 0,
        auctionPaused: false,
        skippedTeams: [],
        playerStartTime: Date.now(),
        isMarqueeRound: isMarquee,
        marqueeBatchIndex: 0,
        categoryBatchIndex: 0,
      };
    }

    case "NEXT_PLAYER": {
      const updatedBatchState = { ...state, categoryBatchIndex: state.categoryBatchIndex + 1 };
      const nextPlayer = getNextPlayerFromPool(updatedBatchState);
      if (!nextPlayer) {
        const advanced = advanceCategory(updatedBatchState);
        if (advanced.phase === "end") {
          return { ...state, ...advanced, currentPlayer: null, auctionLog: addLog(state, "🏆 Auction is complete!", "system") };
        }
        const newState = { ...state, ...advanced };
        const player = getNextPlayerFromPool(newState);
        if (!player) {
          return { ...state, phase: "end", currentPlayer: null, auctionLog: addLog(state, "🏆 Auction is complete!", "system") };
        }
        const marqueeLabel = newState.isMarqueeRound ? "⭐ " : "";
        return {
          ...newState,
          currentPlayer: player,
          currentBid: player.basePrice,
          currentBidder: null,
          bids: [],
          timer: TIMER_DURATION,
          skippedTeams: [],
          playerStartTime: Date.now(),
          auctionLog: addLog(newState, `${marqueeLabel}📢 ${player.name} is up! Base: ${formatPrice(player.basePrice)} | ${player.role} | ${player.nationality}`, "info"),
        };
      }

      const marqueeLabel = updatedBatchState.isMarqueeRound ? "⭐ " : "";
      return {
        ...updatedBatchState,
        currentPlayer: nextPlayer,
        currentBid: nextPlayer.basePrice,
        currentBidder: null,
        bids: [],
        timer: TIMER_DURATION,
        skippedTeams: [],
        playerStartTime: Date.now(),
        auctionLog: addLog(updatedBatchState, `${marqueeLabel}📢 ${nextPlayer.name} is up! Base: ${formatPrice(nextPlayer.basePrice)} | ${nextPlayer.role} | ${nextPlayer.nationality}`, "info"),
      };
    }

    case "PLACE_BID": {
      if (!state.currentPlayer) return state;
      const team = state.teams.find(t => t.teamId === action.teamId);
      if (!team) return state;

      const increment = state.currentBidder === null ? 0 : getBidIncrement(state.currentBid);
      const newBid = state.currentBid + increment;

      const teamLabel = team.isBot ? `🤖 ${team.shortName}` : `👤 ${team.shortName}`;
      
      return {
        ...state,
        currentBid: newBid,
        currentBidder: action.teamId,
        timer: TIMER_DURATION,
        bids: [...state.bids, { teamId: action.teamId, amount: newBid, timestamp: Date.now() }],
        auctionLog: addLog(state, `${teamLabel} bids ${formatPrice(newBid)} for ${state.currentPlayer.name}!`, "bid"),
        skippedTeams: state.skippedTeams.filter(id => id !== action.teamId),
      };
    }

    case "SKIP_PLAYER": {
      if (!state.currentPlayer) return state;
      const team = state.teams.find(t => t.teamId === action.teamId);
      if (!team) return state;
      if (state.skippedTeams.includes(action.teamId)) return state;

      const teamLabel = team.isBot ? `🤖 ${team.shortName}` : `👤 ${team.shortName}`;

      return {
        ...state,
        skippedTeams: [...state.skippedTeams, action.teamId],
        auctionLog: addLog(state, `⏭️ ${teamLabel} skips ${state.currentPlayer.name}`, "skip"),
      };
    }

    case "TICK_TIMER":
      if (state.auctionPaused) return state;
      return { ...state, timer: Math.max(0, state.timer - 1) };

    case "SELL_PLAYER": {
      if (!state.currentPlayer || !state.currentBidder) return state;
      const buyerTeam = state.teams.find(t => t.teamId === state.currentBidder);
      if (!buyerTeam) return state;

      const soldPlayer: AuctionPlayer = {
        ...state.currentPlayer,
        status: "sold",
        soldTo: state.currentBidder,
        soldPrice: state.currentBid,
      };

      const teams = state.teams.map(t =>
        t.teamId === state.currentBidder
          ? { ...t, purse: t.purse - state.currentBid, squad: [...t.squad, soldPlayer] }
          : t
      );

      const updatedPlayerPool = state.playerPool.map(p =>
        p.id === state.currentPlayer!.id ? soldPlayer : p
      );

      const unsoldPlayers = state.isMiniBidRound
        ? state.unsoldPlayers.map(p => p.id === state.currentPlayer!.id ? soldPlayer : p)
        : state.unsoldPlayers;

      return {
        ...state,
        teams,
        playerPool: updatedPlayerPool,
        unsoldPlayers,
        auctionLog: addLog(state, `✅ SOLD! ${state.currentPlayer.name} goes to ${buyerTeam.shortName} for ${formatPrice(state.currentBid)}!`, "sold"),
      };
    }

    case "MARK_UNSOLD": {
      if (!state.currentPlayer) return state;
      const unsoldPlayer: AuctionPlayer = { ...state.currentPlayer, status: "unsold" };

      const updatedPlayerPool = state.playerPool.map(p =>
        p.id === state.currentPlayer!.id ? unsoldPlayer : p
      );

      const unsoldForLater: AuctionPlayer = { ...state.currentPlayer, status: "upcoming" };

      return {
        ...state,
        playerPool: updatedPlayerPool,
        unsoldPlayers: state.isMiniBidRound
          ? state.unsoldPlayers.filter(p => p.id !== state.currentPlayer!.id)
          : [...state.unsoldPlayers, unsoldForLater],
        auctionLog: addLog(state, `❌ ${state.currentPlayer.name} goes UNSOLD!`, "unsold"),
      };
    }

    case "ADD_LOG":
      return { ...state, auctionLog: addLog(state, action.entry.message, action.entry.type) };

    case "SET_ACTIVE_HUMAN":
      return { ...state, activeHumanTeamIndex: action.index };

    case "SWITCH_CATEGORY":
      return { ...state, currentPoolCategory: action.category };

    case "PAUSE_AUCTION":
      return { ...state, auctionPaused: true };

    case "RESUME_AUCTION":
      return { ...state, auctionPaused: false };

    case "RESET_GAME":
      return createInitialState();

    default:
      return state;
  }
}

function createInitialState(): GameState {
  return {
    phase: "login",
    roomId: generateRoomId(),
    roomDbId: null,
    isHost: false,
    sessionId: getSessionId(),
    teams: createInitialTeams(),
    playerPool: createInitialPool(),
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    bids: [],
    timer: TIMER_DURATION,
    auctionLog: [],
    activeHumanTeamIndex: 0,
    currentPoolCategory: "All",
    poolCategoryOrder: POOL_ORDER,
    currentCategoryIndex: 0,
    isMiniBidRound: false,
    auctionPaused: false,
    unsoldPlayers: [],
    skippedTeams: [],
    playerStartTime: 0,
  };
}

interface AuctionContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getHumanTeams: () => TeamSlot[];
  getActiveHumanTeam: () => TeamSlot | null;
  sendAction: (action: GameAction) => void;
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getHumanTeams = useCallback(() => {
    return state.teams.filter(t => !t.isBot);
  }, [state.teams]);

  const getActiveHumanTeam = useCallback(() => {
    const humans = state.teams.filter(t => !t.isBot);
    return humans[state.activeHumanTeamIndex] || null;
  }, [state.teams, state.activeHumanTeamIndex]);

  // Setup broadcast channel when roomDbId is set
  useEffect(() => {
    if (!state.roomDbId) return;

    const channel = supabase.channel(`auction-${state.roomDbId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "game_state" }, ({ payload }) => {
        // Joiners receive state from host
        if (!stateRef.current.isHost && payload) {
          dispatch({ type: "SYNC_STATE", state: payload });
        }
      })
      .on("broadcast", { event: "game_action" }, ({ payload }) => {
        // Host receives actions from joiners
        if (stateRef.current.isHost && payload?.action) {
          const action = payload.action as GameAction;
          // Only allow safe actions from joiners
          if (action.type === "PLACE_BID" || action.type === "SKIP_PLAYER") {
            dispatch(action);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [state.roomDbId]);

  // Host broadcasts state on every change during auction
  useEffect(() => {
    if (!state.isHost || !channelRef.current) return;
    if (state.phase !== "auction" && state.phase !== "end") return;

    // Broadcast relevant state (exclude large pools for performance)
    const broadcastState: Partial<GameState> = {
      phase: state.phase,
      teams: state.teams,
      currentPlayer: state.currentPlayer,
      currentBid: state.currentBid,
      currentBidder: state.currentBidder,
      bids: state.bids,
      timer: state.timer,
      auctionLog: state.auctionLog.slice(0, 50),
      currentCategoryIndex: state.currentCategoryIndex,
      isMiniBidRound: state.isMiniBidRound,
      auctionPaused: state.auctionPaused,
      skippedTeams: state.skippedTeams,
      playerStartTime: state.playerStartTime,
      playerPool: state.playerPool,
      unsoldPlayers: state.unsoldPlayers,
    };

    channelRef.current.send({
      type: "broadcast",
      event: "game_state",
      payload: broadcastState,
    });
  }, [
    state.isHost, state.phase, state.currentPlayer?.id, state.currentBid,
    state.currentBidder, state.timer, state.teams, state.auctionLog.length,
    state.skippedTeams.length, state.auctionPaused,
  ]);

  // Send action: host dispatches locally, joiner sends via broadcast
  const sendAction = useCallback((action: GameAction) => {
    if (state.isHost) {
      dispatch(action);
    } else if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "game_action",
        payload: { action },
      });
    }
  }, [state.isHost]);

  // Countdown timer (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      return;
    }

    tickTimerRef.current = setInterval(() => {
      dispatch({ type: "TICK_TIMER" });
    }, 1000);

    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    };
  }, [state.phase, state.auctionPaused, state.currentPlayer, state.isHost]);

  // Timer expiry → sell or unsold (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.timer > 0 || !state.currentPlayer) return;

    const timeout = setTimeout(() => {
      if (state.currentBidder) {
        dispatch({ type: "SELL_PLAYER" });
      } else {
        dispatch({ type: "MARK_UNSOLD" });
      }
      setTimeout(() => {
        dispatch({ type: "NEXT_PLAYER" });
      }, 1500);
    }, 500);

    return () => clearTimeout(timeout);
  }, [state.timer, state.phase, state.currentPlayer, state.currentBidder, state.isHost]);

  // Auto-skip: if 8 seconds pass with no bids, auto-skip the player (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) return;
    if (state.currentBidder !== null) return; // someone has bid, don't auto-skip

    const elapsed = TIMER_DURATION - state.timer;
    if (elapsed >= AUTO_SKIP_SECONDS) {
      dispatch({ type: "MARK_UNSOLD" });
      setTimeout(() => {
        dispatch({ type: "NEXT_PLAYER" });
      }, 1000);
    }
  }, [state.timer, state.phase, state.currentPlayer, state.currentBidder, state.auctionPaused, state.isHost]);

  // Bot bidding logic (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const botBidders = getBotBidders(state.teams, state.currentPlayer, state.currentBid, state.currentBidder)
      .filter(b => !state.skippedTeams.includes(b.teamId));
    
    if (botBidders.length > 0) {
      const fastest = botBidders[0];
      botTimerRef.current = setTimeout(() => {
        dispatch({ type: "PLACE_BID", teamId: fastest.teamId });
      }, fastest.delay);
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.auctionPaused, state.currentPlayer?.id, state.currentBid, state.currentBidder, state.isHost]);

  // Bot skip logic (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) return;

    const elapsed = (Date.now() - state.playerStartTime) / 1000;
    if (elapsed < SKIP_CUTOFF_SECONDS) {
      const delay = (SKIP_CUTOFF_SECONDS - elapsed) * 1000 + Math.random() * 2000;
      const timeout = setTimeout(() => {
        const botsToSkip = state.teams.filter(t => 
          t.isBot && 
          !state.skippedTeams.includes(t.teamId) &&
          t.teamId !== state.currentBidder
        );
        botsToSkip.forEach(bot => {
          if (Math.random() < 0.4) {
            dispatch({ type: "SKIP_PLAYER", teamId: bot.teamId });
          }
        });
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [state.phase, state.auctionPaused, state.currentPlayer?.id, state.playerStartTime, state.isHost]);

  return (
    <AuctionContext.Provider value={{ state, dispatch, getHumanTeams, getActiveHumanTeam, sendAction }}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const ctx = useContext(AuctionContext);
  if (!ctx) throw new Error("useAuction must be used within AuctionProvider");
  return ctx;
}
