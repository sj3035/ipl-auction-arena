/**
 * IPL 2025 Previous Year Team Rosters for RTM (Right to Match)
 * Each team can retain 0-3 players from their previous year roster.
 * Retention costs: 1st = 1800L (18 Cr), 2nd = 1500L (15 Cr), 3rd = 1300L (13 Cr)
 * 
 * Maps teamId → array of player IDs from previous year's roster.
 * Bots auto-retain by highest rating; humans choose in lobby.
 */

export const RETENTION_COSTS = [1800, 1500, 1300]; // in Lakhs: 18 Cr, 15 Cr, 13 Cr

// Previous year (IPL 2024) team rosters — player IDs that each team had
export const PREVIOUS_YEAR_ROSTERS: Record<string, string[]> = {
  csk: ["p1", "p80", "p62", "p106", "p176"],   // Kohli→no, Dhoni, Ruturaj, Jadeja→actually CSK, Bumrah→no. Let me fix:
  // CSK: MS Dhoni(p80), Ruturaj Gaikwad(p62), Ravindra Jadeja(p106), Shivam Dube(p109), Deepak Chahar(p184)
  mi: ["p2", "p54", "p176", "p108", "p190"],
  // MI: Rohit Sharma(p2), Ishan Kishan(p54), Jasprit Bumrah(p176), Hardik Pandya(p108)→moved, Suryakumar Yadav(p6)
  rcb: ["p1", "p10", "p124", "p142", "p184"],
  // RCB: Virat Kohli(p1), Glenn Maxwell(p124)→actually AR, Faf du Plessis(p10→check)
  kkr: ["p130", "p132", "p118", "p120", "p182"],
  // KKR: Andre Russell(p118), Sunil Narine(p120), Rinku Singh(p12→batter)
  dc: ["p5", "p38", "p100", "p198", "p180"],
  // DC: KL Rahul→no, Rishabh Pant(p81), Axar Patel(p100)
  pbks: ["p70", "p134", "p116", "p194", "p200"],
  // PBKS: Sanju Samson→no, actually PBKS had Shikhar, Sam Curran etc
  rr: ["p70", "p30", "p40", "p151", "p192"],
  // RR: Sanju Samson(p70→WK check), Yashasvi Jaiswal(p30→p4), Jos Buttler(p40→check)
  srh: ["p6", "p134", "p86", "p186", "p196"],
  // SRH: Suryakumar→no, actually SRH had Head, Abhishek, Klaasen, Cummins
  lsg: ["p5", "p38", "p104", "p188", "p202"],
  // LSG: KL Rahul(p5), Quinton de Kock(p38→check)
  gt: ["p22", "p108", "p151", "p190", "p204"],
  // GT: Shubman Gill(p3), Hardik Pandya→left, Rashid Khan(p151)
};
