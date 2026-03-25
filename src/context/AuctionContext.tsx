import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  GameState, GameAction, GamePhase, AuctionPlayer, TeamSlot, AuctionLogEntry, PlayerRole, BotStrategy
} from "@/types/auction";
import { playerPool } from "@/data/players";
import { IPL_TEAMS, INITIAL_PURSE, TIMER_DURATION } from "@/data/teams";
import { getBidIncrement, generateRoomId, generateLogId, formatPrice } from "@/utils/bidUtils";
import { getBotBidders } from "@/utils/botLogic";

const BOT_STRATEGIES: BotStrategy[] = ["aggressive", "balanced", "budget", "specialist"];
const POOL_ORDER: PlayerRole[] = ["Batter", "WK", "All-rounder", "Spinner", "Fast Bowler"];

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
  const category = POOL_ORDER[state.currentCategoryIndex];
  if (!category) return null;

  const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;
  const available = pool.filter(p => p.status === "upcoming" && p.role === category);

  if (available.length === 0) return null;

  // Random pick
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

function advanceCategory(state: GameState): Partial<GameState> {
  let nextIdx = state.currentCategoryIndex + 1;
  
  while (nextIdx < POOL_ORDER.length) {
    const cat = POOL_ORDER[nextIdx];
    const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;
    const available = pool.filter(p => p.status === "upcoming" && p.role === cat);
    if (available.length > 0) break;
    nextIdx++;
  }

  if (nextIdx >= POOL_ORDER.length) {
    // Check if we need mini-auction
    if (!state.isMiniBidRound && state.unsoldPlayers.length > 0) {
      const teamsNeedPlayers = state.teams.some(t => t.squad.length < 18);
      if (teamsNeedPlayers) {
        return {
          currentCategoryIndex: 0,
          isMiniBidRound: true,
          auctionLog: addLog(state, "🔄 Mini-auction round begins! Unsold players return to the pool.", "system"),
        };
      }
    }
    return { phase: "end" as GamePhase };
  }

  return { currentCategoryIndex: nextIdx };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_ROOM_ID":
      return { ...state, roomId: action.roomId };

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
      // Shuffle player pool
      const pool = [...state.playerPool].sort(() => Math.random() - 0.5);
      const firstPlayer = pool.find(p => p.status === "upcoming" && p.role === POOL_ORDER[0]) || pool.find(p => p.status === "upcoming");
      
      if (!firstPlayer) return state;

      const log = addLog(
        { ...state, auctionLog: [] },
        `🏏 IPL Auction begins! First category: ${POOL_ORDER[0]}s`,
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
      };
    }

    case "NEXT_PLAYER": {
      const nextPlayer = getNextPlayerFromPool(state);
      if (!nextPlayer) {
        const advanced = advanceCategory(state);
        if (advanced.phase === "end") {
          return { ...state, ...advanced, currentPlayer: null, auctionLog: addLog(state, "🏆 Auction is complete!", "system") };
        }
        const newState = { ...state, ...advanced };
        const player = getNextPlayerFromPool(newState);
        if (!player) {
          return { ...state, phase: "end", currentPlayer: null, auctionLog: addLog(state, "🏆 Auction is complete!", "system") };
        }
        return {
          ...newState,
          currentPlayer: player,
          currentBid: player.basePrice,
          currentBidder: null,
          bids: [],
          timer: TIMER_DURATION,
          auctionLog: addLog(newState, `📢 ${player.name} is up! Base: ${formatPrice(player.basePrice)} | ${player.role} | ${player.nationality}`, "info"),
        };
      }

      return {
        ...state,
        currentPlayer: nextPlayer,
        currentBid: nextPlayer.basePrice,
        currentBidder: null,
        bids: [],
        timer: TIMER_DURATION,
        auctionLog: addLog(state, `📢 ${nextPlayer.name} is up! Base: ${formatPrice(nextPlayer.basePrice)} | ${nextPlayer.role} | ${nextPlayer.nationality}`, "info"),
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

      const playerPool = state.playerPool.map(p =>
        p.id === state.currentPlayer!.id ? soldPlayer : p
      );

      const unsoldPlayers = state.isMiniBidRound
        ? state.unsoldPlayers.map(p => p.id === state.currentPlayer!.id ? soldPlayer : p)
        : state.unsoldPlayers;

      return {
        ...state,
        teams,
        playerPool,
        unsoldPlayers,
        auctionLog: addLog(state, `✅ SOLD! ${state.currentPlayer.name} goes to ${buyerTeam.shortName} for ${formatPrice(state.currentBid)}!`, "sold"),
      };
    }

    case "MARK_UNSOLD": {
      if (!state.currentPlayer) return state;
      const unsoldPlayer: AuctionPlayer = { ...state.currentPlayer, status: "unsold" };

      const playerPool = state.playerPool.map(p =>
        p.id === state.currentPlayer!.id ? unsoldPlayer : p
      );

      // Add to unsold pool for potential mini-auction (reset status to upcoming)
      const unsoldForLater: AuctionPlayer = { ...state.currentPlayer, status: "upcoming" };

      return {
        ...state,
        playerPool,
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
  };
}

interface AuctionContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getHumanTeams: () => TeamSlot[];
  getActiveHumanTeam: () => TeamSlot | null;
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getHumanTeams = useCallback(() => {
    return state.teams.filter(t => !t.isBot);
  }, [state.teams]);

  const getActiveHumanTeam = useCallback(() => {
    const humans = state.teams.filter(t => !t.isBot);
    return humans[state.activeHumanTeamIndex] || null;
  }, [state.teams, state.activeHumanTeamIndex]);

  // Countdown timer
  useEffect(() => {
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
  }, [state.phase, state.auctionPaused, state.currentPlayer]);

  // Timer expiry → sell or unsold
  useEffect(() => {
    if (state.phase !== "auction" || state.timer > 0 || !state.currentPlayer) return;

    const timeout = setTimeout(() => {
      if (state.currentBidder) {
        dispatch({ type: "SELL_PLAYER" });
      } else {
        dispatch({ type: "MARK_UNSOLD" });
      }
      // Move to next player after a short delay
      setTimeout(() => {
        dispatch({ type: "NEXT_PLAYER" });
      }, 1500);
    }, 500);

    return () => clearTimeout(timeout);
  }, [state.timer, state.phase, state.currentPlayer, state.currentBidder]);

  // Bot bidding logic — triggers on bid/player changes, NOT on timer ticks
  useEffect(() => {
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const botBidders = getBotBidders(state.teams, state.currentPlayer, state.currentBid, state.currentBidder);
    
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
  }, [state.phase, state.auctionPaused, state.currentPlayer?.id, state.currentBid, state.currentBidder]);

  // Persist room state to localStorage
  useEffect(() => {
    if (state.phase !== "login") {
      localStorage.setItem("ipl_auction_room", JSON.stringify({
        roomId: state.roomId,
        phase: state.phase,
      }));
    }
  }, [state.roomId, state.phase]);

  return (
    <AuctionContext.Provider value={{ state, dispatch, getHumanTeams, getActiveHumanTeam }}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const ctx = useContext(AuctionContext);
  if (!ctx) throw new Error("useAuction must be used within AuctionProvider");
  return ctx;
}
