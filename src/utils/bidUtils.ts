import { TeamSlot, AuctionPlayer } from "@/types/auction";
import { MAX_SQUAD, MAX_OVERSEAS } from "@/data/teams";

/** Get bid increment based on current bid amount (in Lakhs) */
export function getBidIncrement(currentBid: number): number {
  if (currentBid < 100) return 10;    // Below 1 Cr → +10L
  if (currentBid <= 500) return 20;   // 1-5 Cr → +20L
  return 50;                           // Above 5 Cr → +50L
}

/** Format amount in Lakhs to display string */
export function formatPrice(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

/** Check if a team can bid on a player */
export function canTeamBid(
  team: TeamSlot,
  currentBid: number,
  currentBidder: string | null,
  player: AuctionPlayer | null
): { canBid: boolean; reason?: string } {
  if (!player) return { canBid: false, reason: "No player up for auction" };
  
  if (currentBidder === team.teamId) {
    return { canBid: false, reason: "You are the current highest bidder" };
  }

  const nextBid = currentBid + getBidIncrement(currentBid);
  
  if (team.purse < nextBid) {
    return { canBid: false, reason: "Insufficient purse" };
  }

  if (team.squad.length >= MAX_SQUAD) {
    return { canBid: false, reason: "Squad is full (25 players)" };
  }

  if (player.nationality === "Overseas") {
    const overseasCount = team.squad.filter(p => p.nationality === "Overseas").length;
    if (overseasCount >= MAX_OVERSEAS) {
      return { canBid: false, reason: "Overseas limit reached (8)" };
    }
  }

  // Check if remaining purse after this bid can fill remaining squad slots
  const remainingSlots = 18 - team.squad.length - 1; // -1 for current player
  if (remainingSlots > 0) {
    const minCostForRemaining = remainingSlots * 20; // Min base price 20L each
    if (team.purse - nextBid < minCostForRemaining) {
      return { canBid: false, reason: "Must reserve purse for remaining squad" };
    }
  }

  return { canBid: true };
}

/** Generate a unique room ID */
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Generate unique ID for log entries */
export function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
