/**
 * IPL 2025 Previous Year (2024) Team Rosters for RTM
 * Retention costs: 1st = 1800L (18 Cr), 2nd = 1500L (15 Cr), 3rd = 1300L (13 Cr)
 * Bots auto-retain by highest rating; humans choose in lobby.
 * Each player appears in exactly ONE team's roster.
 */

export const RETENTION_COSTS = [1800, 1500, 1300]; // in Lakhs
export const MAX_RETENTIONS = 3;

// Previous year rosters — each player ID is unique across all teams
export const PREVIOUS_YEAR_ROSTERS: Record<string, string[]> = {
  csk: ["p80", "p8", "p102"],    // Dhoni, Ruturaj Gaikwad, Jadeja
  mi:  ["p2", "p6", "p176"],     // Rohit, Surya, Bumrah
  rcb: ["p1", "p30", "p117"],    // Kohli, Faf du Plessis, Stokes
  kkr: ["p118", "p119", "p12"],  // Russell, Narine, Rinku Singh
  dc:  ["p81", "p103", "p207"],  // Pant, Axar Patel, Rabada
  pbks:["p121", "p17", "p177"],  // Sam Curran, Abhishek Sharma, Shami
  rr:  ["p9", "p4", "p40"],      // Samson, Jaiswal, Buttler
  srh: ["p37", "p43", "p205"],   // Head, Klaasen, Cummins
  lsg: ["p5", "p32", "p204"],    // KL Rahul, de Kock, Starc
  gt:  ["p3", "p101", "p151"],   // Gill, Hardik, Rashid Khan
};
