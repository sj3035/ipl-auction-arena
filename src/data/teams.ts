import { TeamSlot } from "@/types/auction";

export const IPL_TEAMS: Omit<TeamSlot, "playerName" | "isBot" | "botStrategy" | "purse" | "squad">[] = [
  { teamId: "csk", teamName: "Chennai Super Kings", shortName: "CSK", color: "45 100% 51%" },
  { teamId: "mi", teamName: "Mumbai Indians", shortName: "MI", color: "214 100% 40%" },
  { teamId: "rcb", teamName: "Royal Challengers Bengaluru", shortName: "RCB", color: "0 80% 45%" },
  { teamId: "kkr", teamName: "Kolkata Knight Riders", shortName: "KKR", color: "270 60% 35%" },
  { teamId: "dc", teamName: "Delhi Capitals", shortName: "DC", color: "214 80% 50%" },
  { teamId: "pbks", teamName: "Punjab Kings", shortName: "PBKS", color: "0 85% 50%" },
  { teamId: "rr", teamName: "Rajasthan Royals", shortName: "RR", color: "320 70% 45%" },
  { teamId: "srh", teamName: "Sunrisers Hyderabad", shortName: "SRH", color: "25 95% 53%" },
];

export const INITIAL_PURSE = 12000; // 120 Crore in Lakhs
export const MIN_SQUAD = 18;
export const MAX_SQUAD = 25;
export const MAX_OVERSEAS = 8;
export const TIMER_DURATION = 15;
