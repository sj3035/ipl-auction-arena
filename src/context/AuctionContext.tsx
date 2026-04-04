import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  GameState, GameAction, GamePhase, AuctionPlayer, TeamSlot, AuctionLogEntry, PlayerRole, BotStrategy
} from "@/types/auction";
import { playerPool } from "@/data/players";
import { IPL_TEAMS, INITIAL_PURSE, TIMER_DURATION } from "@/data/teams";
import { getBidIncrement, generateRoomId, generateLogId, formatPrice } from "@/utils/bidUtils";
import { getBotBidders } from "@/utils/botLogic";
import {
  PREVIOUS_YEAR_ROSTERS, MAX_RETENTIONS,
  PLAYER_CAPPED_STATUS, getRetentionCost
} from "@/data/retentions";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/hooks/useSessionId";
import {
  playBidSound, playSoldSound, playUnsoldSound, playMarqueeSound,
  playTimerWarning, playNewPlayerSound
} from "@/utils/auctionSounds";

const BOT_STRATEGIES: BotStrategy[] = ["aggressive", "balanced", "budget", "specialist"];
const AUTO_SKIP_NO_BID = 10; // seconds with no bids → auto-skip
const AUTO_SELL_AFTER_BID = 6; // seconds after last bid → auto-sell
const MARQUEE_RATING = 10;

// Extended pool order: capped roles first, then uncapped roles
type AuctionCategory = { role: PlayerRole; capped: boolean; label: string };
const EXTENDED_POOL_ORDER: AuctionCategory[] = [
  { role: "Batter", capped: true, label: "Capped Batters" },
  { role: "WK", capped: true, label: "Capped WKs" },
  { role: "All-rounder", capped: true, label: "Capped ARs" },
  { role: "Spinner", capped: true, label: "Capped Spinners" },
  { role: "Fast Bowler", capped: true, label: "Capped Pacers" },
  { role: "Batter", capped: false, label: "Uncapped Batters" },
  { role: "WK", capped: false, label: "Uncapped WKs" },
  { role: "All-rounder", capped: false, label: "Uncapped ARs" },
  { role: "Spinner", capped: false, label: "Uncapped Spinners" },
  { role: "Fast Bowler", capped: false, label: "Uncapped Pacers" },
];

function isPlayerCapped(player: AuctionPlayer): boolean {
  return PLAYER_CAPPED_STATUS[player.id] !== false;
}

function createInitialTeams(): TeamSlot[] {
  return IPL_TEAMS.map(t => ({
    ...t,
    playerName: null,
    isBot: true,
    botStrategy: BOT_STRATEGIES[Math.floor(Math.random() * BOT_STRATEGIES.length)],
    purse: INITIAL_PURSE,
    squad: [],
    retainedPlayers: [],
  }));
}

function createInitialPool(): AuctionPlayer[] {
  return playerPool.map(p => ({ ...p, status: "upcoming" as const }));
}

function addLog(state: GameState, message: string, type: AuctionLogEntry["type"]): AuctionLogEntry[] {
  const entry: AuctionLogEntry = { id: generateLogId(), message, type, timestamp: Date.now() };
  return [entry, ...state.auctionLog].slice(0, 200);
}

function getPlayersForCategory(pool: AuctionPlayer[], catIndex: number): AuctionPlayer[] {
  const cat = EXTENDED_POOL_ORDER[catIndex];
  if (!cat) return [];
  return pool.filter(p =>
    p.status === "upcoming" &&
    p.role === cat.role &&
    p.rating < MARQUEE_RATING &&
    isPlayerCapped(p) === cat.capped
  );
}

function getNextPlayerFromPool(state: GameState): AuctionPlayer | null {
  const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;

  if (state.isMarqueeRound) {
    const marquee = pool.filter(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
    if (marquee.length === 0) return null;
    return marquee[Math.floor(Math.random() * marquee.length)];
  }

  const available = getPlayersForCategory(pool, state.currentCategoryIndex);
  if (available.length === 0) return null;

  return available[Math.floor(Math.random() * available.length)];
}

function advanceCategory(state: GameState): Partial<GameState> {
  const pool = state.isMiniBidRound ? state.unsoldPlayers : state.playerPool;

  if (state.isMarqueeRound) {
    const marqueeLeft = pool.filter(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
    if (marqueeLeft.length > 0) return {};
    return {
      isMarqueeRound: false,
      currentCategoryIndex: 0,
      categoryBatchIndex: 0,
      auctionLog: addLog(state, "🏏 Marquee round complete! Moving to Capped Batters.", "system"),
    };
  }

  // Check if current category still has players
  const availableInCat = getPlayersForCategory(pool, state.currentCategoryIndex);
  if (availableInCat.length > 0) {
    return {};
  }

  // Current category exhausted — move to next category with available players
  let nextIdx = state.currentCategoryIndex + 1;
  while (nextIdx < EXTENDED_POOL_ORDER.length) {
    const available = getPlayersForCategory(pool, nextIdx);
    if (available.length > 0) break;
    nextIdx++;
  }

  if (nextIdx >= EXTENDED_POOL_ORDER.length) {
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
    auctionLog: addLog(state, `📋 Now auctioning: ${EXTENDED_POOL_ORDER[nextIdx].label}`, "system"),
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

    case "SYNC_STATE":
      return { ...state, ...action.state };

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
      const marqueeFirst = pool.find(p => p.status === "upcoming" && p.rating >= MARQUEE_RATING);
      const firstPlayer = marqueeFirst || pool.find(p => p.status === "upcoming");

      if (!firstPlayer) return state;

      const isMarquee = !!marqueeFirst;
      const log = addLog(
        { ...state, auctionLog: [] },
        isMarquee ? `⭐ IPL Auction begins! MARQUEE ROUND - Elite players first!` : `🏏 IPL Auction begins! First category: ${EXTENDED_POOL_ORDER[0].label}`,
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
        playerStartTime: Date.now(), // reset for auto-sell tracking
      };
    }

    case "SKIP_PLAYER": {
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
        auctionLog: addLog(state, `⏭️ ${state.currentPlayer.name} skipped — no interest`, "skip"),
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

    case "RETAIN_PLAYER": {
      const roster = PREVIOUS_YEAR_ROSTERS[action.teamId] || [];
      if (!roster.includes(action.playerId)) return state;

      const team = state.teams.find(t => t.teamId === action.teamId);
      if (!team) return state;
      if (team.retainedPlayers.length >= MAX_RETENTIONS) return state;

      const player = state.playerPool.find(p => p.id === action.playerId);
      if (!player) return state;

      const isCapped = PLAYER_CAPPED_STATUS[action.playerId] !== false;
      const cappedCount = team.retainedPlayers.filter(rp => PLAYER_CAPPED_STATUS[rp.id] !== false).length;
      const uncappedCount = team.retainedPlayers.filter(rp => PLAYER_CAPPED_STATUS[rp.id] === false).length;

      const cost = getRetentionCost(cappedCount, uncappedCount, isCapped);
      if (cost === null || team.purse < cost) return state;

      const retainedPlayer: AuctionPlayer = { ...player, status: "sold", soldTo: action.teamId, soldPrice: cost };
      const teams = state.teams.map(t =>
        t.teamId === action.teamId
          ? { ...t, purse: t.purse - cost, squad: [...t.squad, retainedPlayer], retainedPlayers: [...t.retainedPlayers, retainedPlayer] }
          : t
      );
      const updatedPool = state.playerPool.map(p => p.id === action.playerId ? { ...p, status: "sold" as const, soldTo: action.teamId, soldPrice: cost } : p);

      return {
        ...state,
        teams,
        playerPool: updatedPool,
        auctionLog: addLog(state, `🔒 ${team.shortName} retains ${player.name} for ${formatPrice(cost)}${!isCapped ? " (Uncapped)" : ""}!`, "system"),
      };
    }

    case "AUTO_RETAIN_BOTS": {
      let newState = { ...state };
      for (const team of newState.teams) {
        if (!team.isBot) continue;
        const roster = PREVIOUS_YEAR_ROSTERS[team.teamId] || [];
        const available = roster
          .map(pid => newState.playerPool.find(p => p.id === pid && p.status === "upcoming"))
          .filter(Boolean)
          .sort((a, b) => b!.rating - a!.rating);

        const rand = Math.random();
        const maxRetain = Math.min(available.length, MAX_RETENTIONS);
        let retainCount: number;
        if (maxRetain === 0) {
          retainCount = 0;
        } else if (rand < 0.1) {
          retainCount = 0;
        } else if (rand < 0.15) {
          retainCount = Math.min(1, maxRetain);
        } else if (rand < 0.3) {
          retainCount = Math.min(2, maxRetain);
        } else if (rand < 0.5) {
          retainCount = Math.min(3, maxRetain);
        } else if (rand < 0.7) {
          retainCount = Math.min(4, maxRetain);
        } else {
          retainCount = Math.min(5, maxRetain);
        }

        let cappedCount = 0;
        let uncappedCount = 0;
        for (let i = 0; i < retainCount; i++) {
          const player = available[i]!;
          const isCapped = PLAYER_CAPPED_STATUS[player.id] !== false;
          const cost = getRetentionCost(cappedCount, uncappedCount, isCapped);
          if (cost === null) continue;
          const currentTeam = newState.teams.find(t => t.teamId === team.teamId)!;
          if (currentTeam.purse < cost) break;

          if (isCapped) cappedCount++;
          else uncappedCount++;

          const retainedPlayer: AuctionPlayer = { ...player, status: "sold", soldTo: team.teamId, soldPrice: cost };
          newState = {
            ...newState,
            teams: newState.teams.map(t =>
              t.teamId === team.teamId
                ? { ...t, purse: t.purse - cost, squad: [...t.squad, retainedPlayer], retainedPlayers: [...t.retainedPlayers, retainedPlayer] }
                : t
            ),
            playerPool: newState.playerPool.map(p => p.id === player.id ? { ...p, status: "sold" as const, soldTo: team.teamId, soldPrice: cost } : p),
            auctionLog: addLog(newState, `🔒 ${team.shortName} retains ${player.name} for ${formatPrice(cost)}${!isCapped ? " (Uncapped)" : ""}!`, "system"),
          };
        }
      }
      return newState;
    }

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
    poolCategoryOrder: EXTENDED_POOL_ORDER.map(c => c.role),
    currentCategoryIndex: 0,
    isMiniBidRound: false,
    isMarqueeRound: false,
    marqueeBatchIndex: 0,
    categoryBatchIndex: 0,
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

  // Track previous values for sound effects
  const prevPlayerRef = useRef<string | null>(null);
  const prevBidRef = useRef<number>(0);
  const prevTimerRef = useRef<number>(TIMER_DURATION);
  const processingRef = useRef(false); // guard against double-fire of auto-skip/sell

  const getHumanTeams = useCallback(() => {
    return state.teams.filter(t => !t.isBot);
  }, [state.teams]);

  const getActiveHumanTeam = useCallback(() => {
    const humans = state.teams.filter(t => !t.isBot);
    return humans[state.activeHumanTeamIndex] || null;
  }, [state.teams, state.activeHumanTeamIndex]);

  // Sound effects
  useEffect(() => {
    if (state.phase !== "auction") return;

    // New player appeared
    if (state.currentPlayer && state.currentPlayer.id !== prevPlayerRef.current) {
      if (state.currentPlayer.rating >= MARQUEE_RATING) {
        playMarqueeSound();
      } else {
        playNewPlayerSound();
      }
      prevPlayerRef.current = state.currentPlayer.id;
    }

    // Bid placed
    if (state.currentBid > prevBidRef.current && state.currentBidder) {
      playBidSound();
    }
    prevBidRef.current = state.currentBid;

    // Timer warning
    if (state.timer <= 5 && state.timer > 0 && state.timer < prevTimerRef.current) {
      playTimerWarning();
    }
    prevTimerRef.current = state.timer;
  }, [state.phase, state.currentPlayer?.id, state.currentBid, state.timer, state.currentBidder]);

  // Sold/unsold sounds
  useEffect(() => {
    if (state.auctionLog.length === 0) return;
    const latest = state.auctionLog[0];
    if (latest.type === "sold") playSoldSound();
    if (latest.type === "unsold") playUnsoldSound();
  }, [state.auctionLog.length]);

  // Setup broadcast channel when roomDbId is set
  useEffect(() => {
    if (!state.roomDbId) return;

    const channel = supabase.channel(`auction-${state.roomDbId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "game_state" }, ({ payload }) => {
        if (!stateRef.current.isHost && payload) {
          dispatch({ type: "SYNC_STATE", state: payload });
        }
      })
      .on("broadcast", { event: "game_action" }, ({ payload }) => {
        if (stateRef.current.isHost && payload?.action) {
          const action = payload.action as GameAction;
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
      isMarqueeRound: state.isMarqueeRound,
      marqueeBatchIndex: state.marqueeBatchIndex,
      categoryBatchIndex: state.categoryBatchIndex,
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

  // Auto-skip: 10s with no bids → skip (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) return;
    if (state.currentBidder !== null) return; // someone has bid

    const elapsed = TIMER_DURATION - state.timer;
    if (elapsed >= AUTO_SKIP_NO_BID) {
      dispatch({ type: "MARK_UNSOLD" });
      setTimeout(() => {
        dispatch({ type: "NEXT_PLAYER" });
      }, 1000);
    }
  }, [state.timer, state.phase, state.currentPlayer, state.currentBidder, state.auctionPaused, state.isHost]);

  // Auto-sell: 6s after last bid with no new bid → sell (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) return;
    if (state.currentBidder === null) return; // no bid yet

    const elapsed = TIMER_DURATION - state.timer;
    if (elapsed >= AUTO_SELL_AFTER_BID) {
      dispatch({ type: "SELL_PLAYER" });
      setTimeout(() => {
        dispatch({ type: "NEXT_PLAYER" });
      }, 1500);
    }
  }, [state.timer, state.phase, state.currentPlayer, state.currentBidder, state.auctionPaused, state.isHost]);

  // Bot bidding logic (host only)
  useEffect(() => {
    if (!state.isHost) return;
    if (state.phase !== "auction" || state.auctionPaused || !state.currentPlayer) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      return;
    }

    const isMarquee = state.isMarqueeRound;
    const botBidders = getBotBidders(state.teams, state.currentPlayer, state.currentBid, state.currentBidder, isMarquee)
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
