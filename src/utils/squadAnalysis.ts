import { TeamSlot, PlayerRole } from "@/types/auction";

export interface TeamAward {
  teamId: string;
  teamName: string;
  shortName: string;
  color: string;
  score: number;
  strengths: string[];
  title: string;
}

const ROLE_IDEAL: Record<PlayerRole, { min: number; ideal: number }> = {
  "Batter": { min: 4, ideal: 6 },
  "WK": { min: 1, ideal: 2 },
  "All-rounder": { min: 3, ideal: 5 },
  "Spinner": { min: 2, ideal: 3 },
  "Fast Bowler": { min: 3, ideal: 5 },
};

function getRoleDistribution(team: TeamSlot): Record<PlayerRole, number> {
  const counts: Record<PlayerRole, number> = {
    "Batter": 0, "WK": 0, "All-rounder": 0, "Spinner": 0, "Fast Bowler": 0,
  };
  team.squad.forEach(p => { counts[p.role]++; });
  return counts;
}

function getBalanceScore(team: TeamSlot): number {
  const dist = getRoleDistribution(team);
  let score = 0;
  const roles = Object.keys(ROLE_IDEAL) as PlayerRole[];
  
  for (const role of roles) {
    const count = dist[role];
    const { min, ideal } = ROLE_IDEAL[role];
    if (count >= ideal) score += 20;
    else if (count >= min) score += 10 + ((count - min) / (ideal - min)) * 10;
    else score += (count / min) * 10;
  }
  return score; // max 100
}

function getStarPowerScore(team: TeamSlot): number {
  const avgRating = team.squad.length > 0
    ? team.squad.reduce((s, p) => s + p.rating, 0) / team.squad.length
    : 0;
  return Math.min(avgRating * 10, 100); // max 100
}

function getDepthScore(team: TeamSlot): number {
  const size = team.squad.length;
  if (size >= 22) return 100;
  if (size >= 18) return 60 + ((size - 18) / 4) * 40;
  return (size / 18) * 60;
}

function getOverseasBalance(team: TeamSlot): number {
  const overseas = team.squad.filter(p => p.nationality === "Overseas").length;
  // Ideal is 6-8 overseas
  if (overseas >= 6 && overseas <= 8) return 100;
  if (overseas >= 4) return 70;
  return Math.max(30, overseas * 15);
}

function getValueScore(team: TeamSlot): number {
  // Teams that got good players for less money score higher
  if (team.squad.length === 0) return 0;
  const avgPricePerRating = team.squad.reduce((s, p) => {
    const price = p.soldPrice || p.basePrice;
    return s + (price / Math.max(p.rating, 1));
  }, 0) / team.squad.length;
  // Lower avg price per rating = better value
  return Math.max(0, 100 - avgPricePerRating / 10);
}

export function analyzeSquads(teams: TeamSlot[]): TeamAward[] {
  return teams.map(team => {
    const balance = getBalanceScore(team);
    const starPower = getStarPowerScore(team);
    const depth = getDepthScore(team);
    const overseas = getOverseasBalance(team);
    const value = getValueScore(team);
    
    const score = balance * 0.3 + starPower * 0.25 + depth * 0.15 + overseas * 0.15 + value * 0.15;
    
    const strengths: string[] = [];
    if (balance >= 80) strengths.push("Excellent balance");
    if (starPower >= 70) strengths.push("Star-studded");
    if (depth >= 80) strengths.push("Great depth");
    if (overseas >= 80) strengths.push("Smart overseas picks");
    if (value >= 70) strengths.push("Great value buys");
    if (balance < 50) strengths.push("Needs more balance");
    if (team.squad.length < 18) strengths.push("Squad incomplete");

    return {
      teamId: team.teamId,
      teamName: team.teamName,
      shortName: team.shortName,
      color: team.color,
      score: Math.round(score),
      strengths,
      title: "",
    };
  }).sort((a, b) => b.score - a.score).map((award, idx) => ({
    ...award,
    title: idx === 0 ? "🏆 Best Squad" : idx === 1 ? "🥈 Runner Up" : idx === 2 ? "🥉 Third Place" : "",
  }));
}
