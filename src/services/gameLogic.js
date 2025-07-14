import { saveGameState } from './gameService';
import { createDeck, getCardValue } from './cardUtils';
import { getLeftNeighbor } from './playerUtils';

// Check if a player should be skipped
export const shouldSkipPlayer = (player, players) => {
  if (!player || player.hasActed) return false;
  
  // Skip if player has a King
  if (player.hasKing) return true;
  
  // Skip if player is not dealer and their left neighbor has a King
  if (!player.isDealer) {
    const leftNeighbor = getLeftNeighbor(players, player.id);
    return leftNeighbor && leftNeighbor.hasKing;
  }
  
  return false;
};

// Process next player in turn sequence
export const processNextPlayer = (players, currentPlayer, endRoundCallback) => {
  const activePlayers = players.filter(p => !p.eliminated);
  const allPlayersActed = activePlayers.every(p => p.hasActed);
  
  if (allPlayersActed) {
    endRoundCallback();
    return null;
  }
  
  // Find next player who hasn't acted
  const currentIndex = activePlayers.findIndex(p => p.id === currentPlayer);
  let nextIndex = (currentIndex + 1) % activePlayers.length;
  
  while (activePlayers[nextIndex].hasActed) {
    nextIndex = (nextIndex + 1) % activePlayers.length;
  }
  
  return activePlayers[nextIndex].id;
};

// Deal cards for a new round
export const dealNewRound = async (currentPlayers, gameId, numPlayers, existingDeck = null) => {
  const activePlayers = currentPlayers.filter(p => !p.eliminated);
  let newDeck = existingDeck;
  
  // Only create new deck if we don't have enough cards
  if (!newDeck || newDeck.length < activePlayers.length) {
    newDeck = createDeck();
  }
  
  const updatedPlayers = currentPlayers.map(player => {
    if (player.eliminated) {
      // Ensure eliminated players have no cards
      return {
        ...player,
        card: null,
        cardRevealed: false,
        hasKing: false,
        hasActed: true
      };
    }
    
    const card = newDeck.pop();
    const hasKing = card.value === 'K';
    
    return {
      ...player,
      card,
      cardRevealed: hasKing,
      hasKing,
      hasActed: false
    };
  });

  // Find first active player to the left of dealer and start the turn sequence
  const dealerIndex = activePlayers.findIndex(p => p.isDealer);
  
  if (dealerIndex === -1) {
    return { players: updatedPlayers, deck: newDeck, currentPlayer: 0 };
  }
  
  // Next player is the one to the left of dealer (in active players order)
  const nextPlayerIndex = (dealerIndex + 1) % activePlayers.length;
  const nextPlayerId = activePlayers[nextPlayerIndex].id;
  
  // Save updated game state with new round data
  const gameData = {
    gameId: gameId,
    players: updatedPlayers,
    gameState: 'playing',
    numPlayers: numPlayers,
    hostId: currentPlayers.find(p => p.isHost)?.id || 0,
    currentPlayer: nextPlayerId,
    deck: newDeck,
    revealCards: false
  };
  await saveGameState(gameData);
  
  return { 
    players: updatedPlayers, 
    deck: newDeck, 
    currentPlayer: nextPlayerId,
    gameData 
  };
};

// Keep current player's card
export const keepCard = async (players, currentPlayer, gameId, numPlayers, deck, revealCards) => {
  const updatedPlayers = [...players];
  const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer);
  updatedPlayers[currentPlayerIndex].hasActed = true;
  
  // Save updated game state
  const gameData = {
    gameId: gameId,
    players: updatedPlayers,
    gameState: 'playing',
    numPlayers: numPlayers,
    hostId: players.find(p => p.isHost)?.id || 0,
    currentPlayer: currentPlayer,
    deck: deck,
    revealCards: revealCards
  };
  await saveGameState(gameData);
  
  return { players: updatedPlayers, gameData };
};

// Exchange current player's card
export const exchangeCard = async (players, currentPlayer, deck, gameId, numPlayers, revealCards) => {
  const updatedPlayers = [...players];
  const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer);
  const currentPlayerObj = updatedPlayers[currentPlayerIndex];
  let newDeck = deck;
  let exchangeInfo = null;
  
  if (currentPlayerObj.isDealer) {
    // Dealer exchanges with deck
    const newCard = deck[0];
    newDeck = deck.slice(1);
    currentPlayerObj.card = newCard;
    currentPlayerObj.cardRevealed = newCard.value === 'K';
    currentPlayerObj.hasKing = newCard.value === 'K';
    exchangeInfo = { type: 'deck' };
  } else {
    // Exchange with left neighbor
    const leftNeighbor = getLeftNeighbor(updatedPlayers, currentPlayer);
    
    if (!leftNeighbor.hasKing) {
      const tempCard = currentPlayerObj.card;
      currentPlayerObj.card = leftNeighbor.card;
      leftNeighbor.card = tempCard;
      
      // Update card revealed status
      currentPlayerObj.cardRevealed = currentPlayerObj.card.value === 'K';
      currentPlayerObj.hasKing = currentPlayerObj.card.value === 'K';
      leftNeighbor.cardRevealed = leftNeighbor.card.value === 'K';
      leftNeighbor.hasKing = leftNeighbor.card.value === 'K';
      
      exchangeInfo = { type: 'player', playerName: leftNeighbor.name };
    }
  }
  
  currentPlayerObj.hasActed = true;
  
  // Save updated game state
  const gameData = {
    gameId: gameId,
    players: updatedPlayers,
    gameState: 'playing',
    numPlayers: numPlayers,
    hostId: players.find(p => p.isHost)?.id || 0,
    currentPlayer: currentPlayer,
    deck: newDeck,
    revealCards: revealCards
  };
  await saveGameState(gameData);
  
  return { 
    players: updatedPlayers, 
    deck: newDeck, 
    gameData,
    exchangeInfo 
  };
};

// End current round and determine losers
export const endRound = (players) => {
  // Find lowest card value - only consider active (non-eliminated) players
  const activePlayers = players.filter(p => !p.eliminated && p.card);
  
  if (activePlayers.length === 0) {
    return { players, roundResult: null };
  }
  
  const lowestValue = Math.min(...activePlayers.map(p => getCardValue(p.card)));
  const losers = activePlayers.filter(p => getCardValue(p.card) === lowestValue);
  
  // Remove chips from losers (only active players can be losers)
  const updatedPlayers = players.map(player => {
    if (!player.eliminated && losers.some(loser => loser.id === player.id)) {
      const newChips = player.chips - 1;
      return {
        ...player,
        chips: newChips,
        eliminated: newChips === 0
      };
    }
    return player;
  });
  
  const roundResult = {
    lowestValue,
    losers: losers.map(p => p.name),
    eliminatedPlayers: losers.filter(p => p.chips === 1).map(p => p.name)
  };
  
  return { players: updatedPlayers, roundResult };
};

// Start next round with new dealer
export const nextRound = (players) => {
  // Move dealer to next active player
  const activePlayers = players.filter(p => !p.eliminated);
  
  if (activePlayers.length === 0) {
    return { players, newDealerName: null };
  }
  
  // Find current dealer and move to next
  const currentDealerIndex = activePlayers.findIndex(p => p.isDealer);
  if (currentDealerIndex === -1) {
    return { players, newDealerName: null };
  }
  
  const nextDealerIndex = (currentDealerIndex + 1) % activePlayers.length;
  
  const updatedPlayers = players.map(player => ({
    ...player,
    hasActed: false,
    cardRevealed: false,
    hasKing: false,
    isDealer: player.id === activePlayers[nextDealerIndex].id
  }));
  
  return { 
    players: updatedPlayers, 
    newDealerName: activePlayers[nextDealerIndex].name 
  };
};

// Check if game has a winner
export const checkForWinner = (players) => {
  const remainingPlayers = players.filter(p => !p.eliminated && p.chips > 0);
  
  if (remainingPlayers.length === 1) {
    // Single winner
    return remainingPlayers[0].name;
  } else if (remainingPlayers.length === 0) {
    // All players eliminated in final round - it's a tie
    return "TIE GAME";
  }
  
  // Game continues
  return null;
};