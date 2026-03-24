

# IPL Auction Simulator — Full Plan

## 1. Player Database
- Hardcoded JSON with ~600 IPL 2024 auction pool players
- Fields: name, role (Batter/WK/All-rounder/Spinner/Fast Bowler), nationality, base price, rating (1-10), photo placeholder
- Players organized into pools: Batters, WKs, All-rounders, Spinners, Fast Bowlers

## 2. Login & Room System
- **Login Screen**: Enter name + select team from 8 IPL teams dropdown
- **Room ID system**: Host creates room (generates ID), others join with same room ID
- Single-screen hot-seat: players take turns on same device, switching via a "Switch Player" mechanism
- Teams already picked are greyed out and unselectable
- LocalStorage persists user's team across refresh
- Host (first player) sees "Start Auction" button
- Unfilled team slots auto-assigned to BOT players

## 3. Lobby/Waiting Room
- Room ID displayed prominently (copyable)
- 8 team slots showing player name or [BOT] tag
- Real-time updates as players join (React Context state)
- Host starts auction when ready (min 1 human)

## 4. Auction Engine (React Context + useReducer)
- **Auctioneer Bot** randomly picks players from pool (segregated by category rounds)
- **Pool rounds**: Batters → WKs → All-rounders → Spinners → Fast Bowlers (configurable)
- 15-second countdown timer per lot, resets on each new bid
- Bid increment rules: <₹1Cr = ₹10L, ₹1-5Cr = ₹20L, >₹5Cr = ₹50L
- SOLD/UNSOLD logic, unsold players re-enter pool
- Mini-auction for teams with <18 players after main rounds
- Auction ends when all teams have 18-25 players or pool exhausted

## 5. IPL Rule Enforcement
- ₹120Cr purse per team
- Squad: min 18, max 25
- Max 8 overseas players
- Block bidding when: purse insufficient, squad full, overseas limit hit, already leading
- Validate minimum XI composition

## 6. Smart Bot System (4 Strategy Types)
- **Aggressive**: High bids on star players (rating 8+), multiplier 2.5-3.5x
- **Balanced**: Even spending, fills squad gaps, multiplier 1.8-2.5x
- **Budget**: Conservative, targets bargains, multiplier 1.3-1.8x
- **Specialist**: Targets specific roles team needs most, multiplier 2.0-3.0x
- Bots track squad composition, missing roles, overseas slots, purse
- Interest probability based on: player rating × role need × purse remaining
- 2-5 second simulated delay between bot bids
- Occasional bluff bids (5% chance of one extra bid past ceiling)
- Bots compete against each other realistically

## 7. UI Layout (Dark Theme, Tailwind)
### Auction Screen
- **Top center**: Current player card (name, role, nationality, base price, rating stars)
- **Center**: Current bid amount (large) + leading team name + countdown timer bar
- **Left panel**: Player pool with category tabs (Batters/WK/AR/Spin/Fast) + status tags
- **Right panel**: 8 team cards with purse, squad count, overseas count
- **Bottom**: Scrollable live auction commentary feed
- **BID button**: Large green button for active human player, disabled when leading

### Squad Viewer Modal
- Click any team → see full squad with player details and price paid

### End Screen
- Summary table: each team's squad, total spent, remaining purse, stats
- "Play Again" button resets everything

## 8. State Management
- `useReducer` + React Context for all game state
- LocalStorage for room persistence and player identity
- `setInterval`/`setTimeout` for timer and bot simulation

