import { TeamSlot, AuctionPlayer, BotStrategy, PlayerRole } from "@/types/auction";
import { canTeamBid, getBidIncrement } from "./bidUtils";

interface BotDecision {
  shouldBid: boolean;
  delay: number; // ms
}

/** Count players by role in a team's squad */
function getRoleCounts(squad: AuctionPlayer[]): Record<PlayerRole, number> {
  const counts: Record<PlayerRole, number> = {
    "Batter": 0, "WK": 0, "All-rounder": 0, "Spinner": 0, "Fast Bowler": 0,
  };
  squad.forEach(p => { counts[p.role]++; });
  return counts;
}

/** Get role need score (higher = more needed) */
function getRoleNeed(team: TeamSlot, role: PlayerRole): number {
  const counts = getRoleCounts(team.squad);
  const targets: Record<PlayerRole, number> = {
    "Batter": 5, "WK": 2, "All-rounder": 4, "Spinner": 3, "Fast Bowler": 4,
  };
  const current = counts[role];
  const target = targets[role];
  if (current === 0 && team.squad.length > 10) return 1.0; // Desperate need
  if (current < target) return 0.7 + (target - current) * 0.1;
  if (current >= target + 2) return 0.1; // Over-stocked
  return 0.3;
}

/** Count marquee players in a team's squad */
function getMarqueeCount(squad: AuctionPlayer[]): number {
  return squad.filter(p => p.rating >= 10).length;
}

/** Calculate interest probability based on strategy */
function getInterestProbability(
  bot: TeamSlot,
  player: AuctionPlayer,
  strategy: BotStrategy,
  isMarquee: boolean = false
): number {
  // Marquee players: ensure each bot gets 1-2 marquee players
  if (isMarquee) {
    const marqueeOwned = getMarqueeCount(bot.squad);
    const purseFactor = bot.purse / 12000;
    if (purseFactor < 0.3) return 0.05; // Can't afford
    // Already has 2+ marquee: very low interest
    if (marqueeOwned >= 2) return 0.05;
    // Has 0 marquee: extremely high interest (must get at least 1)
    if (marqueeOwned === 0) return 0.98;
    // Has 1 marquee: moderate-high interest for a second
    return strategy === "aggressive" ? 0.85 : strategy === "balanced" ? 0.7 : strategy === "specialist" ? 0.65 : 0.5;
  }

  const roleNeed = getRoleNeed(bot, player.role);
  const ratingFactor = player.rating / 10;
  const purseFactor = bot.purse / 12000;
  const squadFactor = bot.squad.length < 10 ? 0.8 : bot.squad.length < 15 ? 0.5 : 0.3;

  let base: number;
  switch (strategy) {
    case "aggressive":
      base = ratingFactor >= 0.8 ? 0.7 : ratingFactor >= 0.6 ? 0.4 : 0.2;
      return Math.min(1, base * (1 + roleNeed) * purseFactor);
    case "balanced":
      base = 0.4 * roleNeed + 0.3 * ratingFactor + 0.3 * squadFactor;
      return Math.min(1, base * purseFactor * 1.2);
    case "budget":
      base = player.basePrice <= 50 ? 0.5 : player.basePrice <= 100 ? 0.3 : 0.1;
      return Math.min(1, base * roleNeed * purseFactor);
    case "specialist": {
      // Pick top 2 most needed roles
      const counts = getRoleCounts(bot.squad);
      const roles: PlayerRole[] = ["Batter", "WK", "All-rounder", "Spinner", "Fast Bowler"];
      const sorted = roles.sort((a, b) => counts[a] - counts[b]);
      const topNeeded = sorted.slice(0, 2);
      if (topNeeded.includes(player.role)) {
        return Math.min(1, 0.6 * ratingFactor * purseFactor * 1.5);
      }
      return 0.1 * purseFactor;
    }
  }
}

/** Get max bid ceiling for a bot based on strategy */
function getMaxBidCeiling(
  player: AuctionPlayer,
  strategy: BotStrategy,
  roleNeed: number,
  isMarquee: boolean = false
): number {
  // Marquee players (rating 10): aggressive bidding 10-20 Cr range
  if (isMarquee) {
    const marqueeOwned = getMarqueeCount({ squad: [] } as any); // dummy - we need team context
    const minCeiling = 1000; // 10 Cr
    const maxCeiling = 2000; // 20 Cr
    const aggressiveness = strategy === "aggressive" ? 0.8 : strategy === "balanced" ? 0.5 : strategy === "specialist" ? 0.6 : 0.3;
    return Math.round(minCeiling + (maxCeiling - minCeiling) * (aggressiveness + Math.random() * 0.3));
  }

  let multiplier: number;
  switch (strategy) {
    case "aggressive":
      multiplier = 2.5 + Math.random() * 1.0;
      if (player.rating >= 9) multiplier += 0.5;
      break;
    case "balanced":
      multiplier = 1.8 + Math.random() * 0.7;
      multiplier += roleNeed * 0.3;
      break;
    case "budget":
      multiplier = 1.3 + Math.random() * 0.5;
      break;
    case "specialist":
      multiplier = 2.0 + Math.random() * 1.0;
      if (roleNeed > 0.7) multiplier += 0.5;
      break;
  }
  return Math.round(player.basePrice * multiplier);
}

/** Decide if a bot should bid on the current player */
export function botShouldBid(
  bot: TeamSlot,
  player: AuctionPlayer,
  currentBid: number,
  currentBidder: string | null,
  isMarquee: boolean = false
): BotDecision {
  const strategy = bot.botStrategy || "balanced";
  
  const { canBid } = canTeamBid(bot, currentBid, currentBidder, player);
  if (!canBid) return { shouldBid: false, delay: 0 };

  const interest = getInterestProbability(bot, player, strategy, isMarquee);
  const roleNeed = getRoleNeed(bot, player.role);
  const maxCeiling = getMaxBidCeiling(player, strategy, roleNeed, isMarquee);
  const nextBid = currentBid + getBidIncrement(currentBid);

  // Check if next bid exceeds ceiling
  if (nextBid > maxCeiling) {
    // 5% bluff chance
    if (Math.random() < 0.05) {
      return { shouldBid: true, delay: 2000 + Math.random() * 3000 };
    }
    return { shouldBid: false, delay: 0 };
  }

  // Roll for interest
  if (Math.random() > interest) {
    return { shouldBid: false, delay: 0 };
  }

  // Marquee: faster bidding
  const delay = isMarquee ? (1000 + Math.random() * 2000) : (2000 + Math.random() * 3000);
  return { shouldBid: true, delay };
}

/** Get all bot teams that might bid, sorted by fastest delay */
export function getBotBidders(
  teams: TeamSlot[],
  player: AuctionPlayer,
  currentBid: number,
  currentBidder: string | null,
  isMarquee: boolean = false
): Array<{ teamId: string; delay: number }> {
  const bidders: Array<{ teamId: string; delay: number }> = [];
  
  for (const team of teams) {
    if (!team.isBot) continue;
    const decision = botShouldBid(team, player, currentBid, currentBidder, isMarquee);
    if (decision.shouldBid) {
      bidders.push({ teamId: team.teamId, delay: decision.delay });
    }
  }
  
  return bidders.sort((a, b) => a.delay - b.delay);
}
