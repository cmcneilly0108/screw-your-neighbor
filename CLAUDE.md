# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer card game called "Screw Your Neighbor" built with React and Firebase. The game supports 2-6 players with real-time multiplayer functionality and activity logging.

## Common Commands

### Development
- `npm start` - Start development server at http://localhost:3000
- `npm run build` - Build for production
- `npm test` - Run tests in watch mode

### Deployment
- `npm run deploy` - Deploy to GitHub Pages (requires `npm run build` first)

## Architecture

### Core Components
- **ScrewYourNeighborGame.js** - Main game component containing all UI logic and game flow
- **App.js** - Simple wrapper that renders the main game component

### State Management
- **useGameState.js** - Custom hook managing all game state (players, cards, rounds, etc.)
- **useMultiplayer.js** - Custom hook handling Firebase real-time synchronization

### Services Layer
- **gameService.js** - Firebase Realtime Database operations for game state
- **gameLogic.js** - Core game mechanics (dealing, exchanges, round endings)
- **cardUtils.js** - Card rendering and value calculations
- **playerUtils.js** - Player positioning and game creation/joining
- **activityLogService.js** - Firestore operations for activity logging

### Firebase Setup
The app uses two Firebase services:
- **Realtime Database** - Game state synchronization
- **Firestore** - Activity log synchronization

Configuration is in `src/firebase.js`. The app gracefully falls back to localStorage if Firebase isn't configured.

### Game Flow
1. **Setup** - Player creates/joins game with unique 6-character game ID
2. **Waiting** - Players join until host starts game
3. **Playing** - Turn-based card game with real-time updates
4. **Game Over** - Winner announced, option to play again

### Key Game Logic
- Players start with 3 chips, lose 1 chip for having lowest card each round
- Kings are automatically revealed and cannot be exchanged
- Players can exchange cards with left neighbor (unless neighbor has King)
- Dealer exchanges with deck instead of neighbor
- Last player with chips wins

### Development Notes
- The app handles multiplayer synchronization automatically
- Activity logs provide real-time game event tracking
- UI uses Tailwind CSS for styling
- Game state is persisted and synchronized across all players
- Supports both Firebase and localStorage fallback modes

### Firebase Configuration
Update `src/firebase.js` with your Firebase config for multiplayer functionality. See `FIREBASE_SETUP.md` for detailed setup instructions.

Firestore rules should allow read/write access to activity logs - see `FIRESTORE_RULES.md` for configuration.