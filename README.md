# Screw Your Neighbor 🃏

A multiplayer card game where players try to avoid having the lowest card each round. The last player with chips wins!

## 🎮 How to Play

### Game Setup
- 2-6 players can join a game
- Each player starts with 3 chips
- One player creates a game and shares the 6-character game ID
- Other players join using the game ID

### Basic Rules
1. **Each round**, every player is dealt one card
2. **Goal**: Don't have the lowest card value when cards are revealed
3. **Card Values**: Ace = 1 (lowest), 2-10 = face value, J = 11, Q = 12, K = 13 (highest)
4. **Losing**: Players with the lowest card(s) lose one chip
5. **Elimination**: When you lose your last chip, you're out
6. **Winner**: Last player with chips remaining wins!

### Turn Sequence
Players take turns in order, starting to the left of the dealer:

**Your Turn Options:**
- **Keep Card**: Keep your current card (end your turn)
- **Exchange Card**: Swap cards with your left neighbor OR the deck (if you're the dealer)

**Special Rules:**
- **Kings are revealed immediately** and cannot be exchanged
- **You cannot exchange with a neighbor who has a King** (their King protects them)
- **The dealer** exchanges with the deck instead of a neighbor
- **Auto-skip**: Players with Kings or blocked by Kings skip their turn automatically

### Round End
- After all players have acted, cards are revealed
- Players with the lowest card value lose one chip
- **Ties**: All tied players lose a chip
- Players with 0 chips are eliminated
- The dealer role moves to the next player for the next round

### Winning
- **Single Winner**: Last player with chips wins
- **Tie Game**: If all remaining players are eliminated in the same round

## 🚀 Getting Started

### Play Online
Visit the deployed game at: [Game URL]

### Run Locally
1. Clone this repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
4. Open [http://localhost:3000](http://localhost:3000)

### Multiplayer Setup
For full multiplayer functionality, you'll need to configure Firebase:
1. See `FIREBASE_SETUP.md` for detailed setup instructions
2. The game works offline with localStorage as a fallback

## 🎯 Strategy Tips

- **Early rounds**: Consider exchanging to avoid very low cards (Aces, 2s, 3s)
- **Late rounds**: Be more cautious - other players may have higher cards
- **Watch for Kings**: Pay attention to revealed Kings to know your exchange options
- **Dealer advantage**: Dealers can't get stuck with a neighbor's bad card
- **Chip management**: Sometimes it's worth taking a risk when you have multiple chips

## 🔧 Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages

### Tech Stack
- **Frontend**: React with Tailwind CSS
- **Backend**: Firebase (Realtime Database + Firestore)
- **Deployment**: GitHub Pages

## 📝 Game Variations

This implementation follows the classic "Screw Your Neighbor" rules. Some variations include:
- Different starting chip counts
- Multiple rounds of exchanges per turn
- Different card values or deck modifications

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the game!

## 📄 License

This project is open source and available under the [MIT License](LICENSE).