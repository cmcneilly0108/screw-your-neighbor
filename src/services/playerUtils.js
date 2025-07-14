import { saveGameState, loadGameState } from './gameService';

// Get the left neighbor of a player
export const getLeftNeighbor = (currentPlayers, playerIndex) => {
  const activePlayers = currentPlayers.filter(p => !p.eliminated);
  const currentIdx = activePlayers.findIndex(p => p.id === playerIndex);
  const leftNeighborIdx = (currentIdx + 1) % activePlayers.length;
  return activePlayers[leftNeighborIdx];
};

// Calculate player position for circular layout
export const getPlayerPosition = (playerIndex, totalPlayers) => {
  const angle = (playerIndex / totalPlayers) * 2 * Math.PI - Math.PI / 2; // Start at top
  const radius = 180; // Distance from center
  const x = 50 + (Math.cos(angle) * radius * 0.3); // 0.3 to make it more oval
  const y = 50 + (Math.sin(angle) * radius * 0.2); // 0.2 to make it more oval
  return { x, y };
};

// Create a new game
export const createGame = async (hostName, numPlayers) => {
  if (!hostName.trim()) return null;
  
  try {
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const hostPlayer = {
      id: 0,
      name: hostName.trim(),
      chips: 3,
      card: null,
      isDealer: true,
      cardRevealed: false,
      hasKing: false,
      eliminated: false,
      isHost: true
    };
    
    const newPlayers = [hostPlayer];
    
    // Save game state to Firebase
    const gameData = {
      gameId: newGameId,
      players: newPlayers,
      gameState: 'waiting',
      numPlayers: numPlayers,
      hostId: 0
    };
    
    const saveSuccess = await saveGameState(gameData);
    
    if (!saveSuccess) {
      throw new Error('Failed to save game state');
    }
    
    // Save myPlayerId to sessionStorage (unique per tab) instead of localStorage
    const tabId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(`myTabId_${newGameId}`, tabId);
    sessionStorage.setItem(`myPlayerId_${newGameId}`, '0');
    sessionStorage.setItem(`myPlayerName_${newGameId}`, hostName);
    
    return {
      gameId: newGameId,
      players: newPlayers,
      isHost: true,
      myPlayerId: 0
    };
  } catch (error) {
    console.error('Error creating game:', error);
    return null;
  }
};

// Join an existing game
export const joinGame = async (playerName, gameId) => {
  if (!playerName.trim() || !gameId.trim()) return null;
  
  try {
    const gameData = await loadGameState(gameId.toUpperCase());
    
    if (!gameData || gameData.gameState !== 'waiting') {
      return { error: 'Game not found or already started' };
    }
    
    if (gameData.players.length >= gameData.numPlayers) {
      return { error: 'Game is full' };
    }
    
    // Check if player name already exists
    if (gameData.players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      return { error: 'Player name already taken' };
    }
    
    const newPlayerId = gameData.players.length;
    const newPlayer = {
      id: newPlayerId,
      name: playerName.trim(),
      chips: 3,
      card: null,
      isDealer: false,
      cardRevealed: false,
      hasKing: false,
      eliminated: false,
      isHost: false
    };
    
    const updatedPlayers = [...gameData.players, newPlayer];
    
    // Update game data
    const updatedGameData = {
      ...gameData,
      players: updatedPlayers
    };
    
    const saveSuccess = await saveGameState(updatedGameData);
    
    if (!saveSuccess) {
      throw new Error('Failed to save game state');
    }
    
    // Save myPlayerId to sessionStorage (unique per tab)
    const tabId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(`myTabId_${gameId.toUpperCase()}`, tabId);
    sessionStorage.setItem(`myPlayerId_${gameId.toUpperCase()}`, newPlayerId.toString());
    sessionStorage.setItem(`myPlayerName_${gameId.toUpperCase()}`, playerName);
    
    return {
      gameId: gameId.toUpperCase(),
      players: updatedPlayers,
      isHost: false,
      myPlayerId: newPlayerId,
      gameState: gameData.gameState,
      numPlayers: gameData.numPlayers
    };
  } catch (error) {
    console.error('Error joining game:', error);
    return { error: 'Failed to join game' };
  }
};

// Reset all game state
export const resetGame = () => {
  // Clear all session storage for any games
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('myTabId_') || key.startsWith('myPlayerId_') || key.startsWith('myPlayerName_')) {
      sessionStorage.removeItem(key);
    }
  });
  
  return {
    gameState: 'setup',
    numPlayers: 4,
    players: [],
    currentPlayer: 0,
    deck: [],
    revealCards: false,
    roundResult: null,
    winner: null,
    hostName: '',
    playerName: '',
    isHost: false,
    gameId: null,
    joinGameId: '',
    showJoinForm: false,
    myPlayerId: null,
    activityLog: [],
    activityLogError: null
  };
};