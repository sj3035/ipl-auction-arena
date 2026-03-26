export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  nationality: "Indian" | "Overseas";
  basePrice: number; // in Lakhs
  rating: number; // 1-10
}

export type PlayerRole = "Batter" | "WK" | "All-rounder" | "Spinner" | "Fast Bowler";

export type PlayerStatus = "upcoming" | "sold" | "unsold";

export interface AuctionPlayer extends Player {
  status: PlayerStatus;
  soldTo?: string; // team id
  soldPrice?: number; // in Lakhs
}

export type BotStrategy = "aggressive" | "balanced" | "budget" | "specialist";

export interface TeamSlot {
  teamId: string;
  teamName: string;
  shortName: string;
  color: string; // HSL
  playerName: string | null; // null = bot
  isBot: boolean;
  botStrategy?: BotStrategy;
  purse: number; // in Lakhs (12000 = 120 Cr)
  squad: AuctionPlayer[];
}

export interface BidEntry {
  teamId: string;
  amount: number; // in Lakhs
  timestamp: number;
}

export interface AuctionLogEntry {
  id: string;
  message: string;
  type: "info" | "bid" | "sold" | "unsold" | "system" | "skip";
  timestamp: number;
}

export type GamePhase = "login" | "lobby" | "auction" | "end";

export type PoolCategory = "All" | PlayerRole;

export interface GameState {
  phase: GamePhase;
  roomId: string;
  teams: TeamSlot[];
  playerPool: AuctionPlayer[];
  currentPlayer: AuctionPlayer | null;
  currentBid: number;
  currentBidder: string | null; // team id
  bids: BidEntry[];
  timer: number; // seconds remaining
  auctionLog: AuctionLogEntry[];
  activeHumanTeamIndex: number; // for hot-seat switching
  currentPoolCategory: PoolCategory;
  poolCategoryOrder: PlayerRole[];
  currentCategoryIndex: number;
  isMiniBidRound: boolean;
  auctionPaused: boolean;
  unsoldPlayers: AuctionPlayer[];
  skippedTeams: string[]; // teams that skipped current player
  playerStartTime: number; // timestamp when current player was put up
}

export type GameAction =
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_ROOM_ID"; roomId: string }
  | { type: "JOIN_TEAM"; teamId: string; playerName: string }
  | { type: "LEAVE_TEAM"; teamId: string }
  | { type: "START_AUCTION" }
  | { type: "NEXT_PLAYER" }
  | { type: "PLACE_BID"; teamId: string }
  | { type: "TICK_TIMER" }
  | { type: "SELL_PLAYER" }
  | { type: "MARK_UNSOLD" }
  | { type: "ADD_LOG"; entry: Omit<AuctionLogEntry, "id" | "timestamp"> }
  | { type: "SET_ACTIVE_HUMAN"; index: number }
  | { type: "SWITCH_CATEGORY"; category: PoolCategory }
  | { type: "RESET_GAME" }
  | { type: "PAUSE_AUCTION" }
  | { type: "RESUME_AUCTION" }
  | { type: "SKIP_PLAYER"; teamId: string };
