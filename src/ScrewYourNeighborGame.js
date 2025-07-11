import React, { useState, useEffect } from 'react';
import { Shuffle, RotateCcw } from 'lucide-react';
import { saveGameState, loadGameState } from './services/gameService';

const ScrewYourNeighborGame = () => {
  const [gameState, setGameState] = useState('setup');
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [deck, setDeck] = useState([]);
  const [revealCards, setRevealCards] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [winner, setWinner] = useState(null);
  const [hostName, setHostName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(null);

  // Card suits and values
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const getCardValue = (card) => {
    if (!card) return 0;
    if (card.value === 'A') return 1;
    if (card.value === 'J') return 11;
    if (card.value === 'Q') return 12;
    if (card.value === 'K') return 13;
    return parseInt(card.value);
  };

  const getLeftNeighbor = (currentPlayers, playerIndex) => {
    const activePlayers = currentPlayers.filter(p => !p.eliminated);
    const currentIdx = activePlayers.findIndex(p => p.id === playerIndex);
    const leftNeighborIdx = (currentIdx + 1) % activePlayers.length;
    return activePlayers[leftNeighborIdx];
  };

  const shouldSkipPlayer = (player, players) => {
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

  const processNextPlayer = () => {
    const activePlayers = players.filter(p => !p.eliminated);
    const allPlayersActed = activePlayers.every(p => p.hasActed);
    
    if (allPlayersActed) {
      endRound();
      return;
    }
    
    // Find next player who hasn't acted
    const currentIndex = activePlayers.findIndex(p => p.id === currentPlayer);
    let nextIndex = (currentIndex + 1) % activePlayers.length;
    
    while (activePlayers[nextIndex].hasActed) {
      nextIndex = (nextIndex + 1) % activePlayers.length;
    }
    
    const nextPlayer = activePlayers[nextIndex];
    
    // If next player should be skipped, auto-skip them immediately
    if (shouldSkipPlayer(nextPlayer, players)) {
      const updatedPlayers = players.map(p => 
        p.id === nextPlayer.id ? { ...p, hasActed: true } : p
      );
      setPlayers(updatedPlayers);
      
      // Save updated game state with skipped player
      const gameData = {
        gameId: gameId,
        players: updatedPlayers,
        gameState: 'playing',
        numPlayers: numPlayers,
        hostId: players.find(p => p.isHost)?.id || 0,
        currentPlayer: currentPlayer, // Keep current player the same until we find one who shouldn't be skipped
        deck: deck,
        revealCards: revealCards
      };
      saveGameState(gameData);
      
      // Continue to next player after a brief delay with the updated players
      setTimeout(() => {
        processNextPlayerWithUpdatedState(updatedPlayers);
      }, 800);
    } else {
      // Player can take their turn normally
      setCurrentPlayer(nextPlayer.id);
      
      // Save updated game state with new current player
      const gameData = {
        gameId: gameId,
        players: players,
        gameState: 'playing',
        numPlayers: numPlayers,
        hostId: players.find(p => p.isHost)?.id || 0,
        currentPlayer: nextPlayer.id,
        deck: deck,
        revealCards: revealCards
      };
      saveGameState(gameData);
    }
  };

  const getPlayerPosition = (playerIndex, totalPlayers) => {
    const angle = (playerIndex / totalPlayers) * 2 * Math.PI - Math.PI / 2; // Start at top
    const radius = 180; // Distance from center
    const x = 50 + (Math.cos(angle) * radius * 0.3); // 0.3 to make it more oval
    const y = 50 + (Math.sin(angle) * radius * 0.2); // 0.2 to make it more oval
    return { x, y };
  };

  const createDeck = () => {
    const newDeck = [];
    for (let suit of suits) {
      for (let value of values) {
        newDeck.push({ suit, value });
      }
    }
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createGame = async () => {
    if (!hostName.trim()) return;
    
    try {
      console.log('Creating game...');
      const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated game ID:', newGameId);
      
      setGameId(newGameId);
      setIsHost(true);
      
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
      setPlayers(newPlayers);
      setGameState('waiting');
      setMyPlayerId(0); // Host is player 0
      
      // Save game state to Firebase
      const gameData = {
        gameId: newGameId,
        players: newPlayers,
        gameState: 'waiting',
        numPlayers: numPlayers,
        hostId: 0
      };
      
      console.log('Attempting to save game state...');
      const saveSuccess = await saveGameState(gameData);
      
      if (!saveSuccess) {
        throw new Error('Failed to save game state');
      }
      
      // Save myPlayerId to sessionStorage (unique per tab) instead of localStorage
      const tabId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(`myTabId_${newGameId}`, tabId);
      sessionStorage.setItem(`myPlayerId_${newGameId}`, '0');
      sessionStorage.setItem(`myPlayerName_${newGameId}`, hostName);
      
      console.log('Game created successfully!');
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please check your internet connection and try again.');
      
      // Reset state on error
      setGameState('setup');
      setGameId(null);
      setPlayers([]);
      setMyPlayerId(null);
      setIsHost(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !joinGameId.trim()) return;
    
    // Load game state from Firebase
    const gameData = await loadGameState(joinGameId.toUpperCase());
    
    if (!gameData) {
      alert(`Game ID not found. Please check the Game ID and try again.\nLooking for: ${joinGameId.toUpperCase()}`);
      return;
    }
    
    // Check if game is full
    if (gameData.players.length >= gameData.numPlayers) {
      alert('This game is full. Please try a different game.');
      return;
    }
    
    // Check if player name is already taken
    if (gameData.players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      alert('A player with this name already exists in the game. Please choose a different name.');
      return;
    }
    
    const newPlayer = {
      id: gameData.players.length,
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
    
    // Update local state
    setGameId(gameData.gameId);
    setPlayers(updatedPlayers);
    setGameState('waiting');
    setNumPlayers(gameData.numPlayers);
    setIsHost(false);
    setMyPlayerId(newPlayer.id); // Set this player's ID
    
    // Save updated game state
    const updatedGameData = {
      ...gameData,
      players: updatedPlayers
    };
    await saveGameState(updatedGameData);
    
    // Save myPlayerId to sessionStorage (unique per tab) instead of localStorage
    const tabId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(`myTabId_${gameData.gameId}`, tabId);
    sessionStorage.setItem(`myPlayerId_${gameData.gameId}`, newPlayer.id.toString());
    sessionStorage.setItem(`myPlayerName_${gameData.gameId}`, playerName);
  };

  const startGame = () => {
    if (players.length < 2) return;
    
    setGameState('playing');
    window.gameStartTime = Date.now(); // Track when game starts to prevent polling conflicts
    dealNewRound(players);
    
    // Save updated game state
    const gameData = {
      gameId: gameId,
      players: players,
      gameState: 'playing',
      numPlayers: numPlayers,
      hostId: players.find(p => p.isHost)?.id || 0,
      currentPlayer: currentPlayer,
      deck: deck,
      revealCards: revealCards
    };
    saveGameState(gameData);
  };

  const processNextPlayerWithUpdatedState = (updatedPlayers) => {
    const activePlayers = updatedPlayers.filter(p => !p.eliminated);
    const allPlayersActed = activePlayers.every(p => p.hasActed);
    
    if (allPlayersActed) {
      endRound();
      return;
    }
    
    // Find next player who hasn't acted
    const currentIndex = activePlayers.findIndex(p => p.id === currentPlayer);
    let nextIndex = (currentIndex + 1) % activePlayers.length;
    
    while (activePlayers[nextIndex].hasActed) {
      nextIndex = (nextIndex + 1) % activePlayers.length;
    }
    
    const nextPlayer = activePlayers[nextIndex];
    
    // If next player should be skipped, auto-skip them immediately
    if (shouldSkipPlayer(nextPlayer, updatedPlayers)) {
      const newUpdatedPlayers = updatedPlayers.map(p => 
        p.id === nextPlayer.id ? { ...p, hasActed: true } : p
      );
      setPlayers(newUpdatedPlayers);
      
      // Continue to next player after a brief delay
      setTimeout(() => {
        processNextPlayerWithUpdatedState(newUpdatedPlayers);
      }, 800);
    } else {
      // Player can take their turn normally
      setCurrentPlayer(nextPlayer.id);
      
      // Save updated game state with new current player
      const gameData = {
        gameId: gameId,
        players: updatedPlayers,
        gameState: 'playing',
        numPlayers: numPlayers,
        hostId: updatedPlayers.find(p => p.isHost)?.id || 0,
        currentPlayer: nextPlayer.id,
        deck: deck,
        revealCards: revealCards
      };
      saveGameState(gameData);
    }
  };

  const dealNewRound = (currentPlayers, existingDeck = null) => {
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

    setPlayers(updatedPlayers);
    setDeck(newDeck);
    setRevealCards(false);
    setRoundResult(null);
    
    // Find first active player to the left of dealer and start the turn sequence
    const dealerIndex = activePlayers.findIndex(p => p.isDealer);
    
    if (dealerIndex === -1) {
      return;
    }
    
    // Next player is the one to the left of dealer (in active players order)
    const nextPlayerIndex = (dealerIndex + 1) % activePlayers.length;
    const nextPlayerId = activePlayers[nextPlayerIndex].id;
    
    setCurrentPlayer(nextPlayerId);
    
    // Save updated game state with new round data - use a slight delay to ensure state is set
    setTimeout(() => {
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
      saveGameState(gameData);
    }, 100);
    
    // Check for auto-skips after initial setup
    setTimeout(() => {
      const firstPlayer = updatedPlayers.find(p => p.id === nextPlayerId);
      if (shouldSkipPlayer(firstPlayer, updatedPlayers)) {
        const skippedPlayers = updatedPlayers.map(p => 
          p.id === nextPlayerId ? { ...p, hasActed: true } : p
        );
        setPlayers(skippedPlayers);
        
        // Save updated game state with skipped player
        const skippedGameData = {
          gameId: gameId,
          players: skippedPlayers,
          gameState: 'playing',
          numPlayers: numPlayers,
          hostId: currentPlayers.find(p => p.isHost)?.id || 0,
          currentPlayer: nextPlayerId,
          deck: newDeck,
          revealCards: false
        };
        saveGameState(skippedGameData);
        
        setTimeout(() => processNextPlayerWithUpdatedState(skippedPlayers), 800);
      }
    }, 100);
  };

  const keepCard = () => {
    const updatedPlayers = [...players];
    const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer);
    updatedPlayers[currentPlayerIndex].hasActed = true;
    setPlayers(updatedPlayers);
    
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
    saveGameState(gameData);
    
    moveToNextPlayer();
  };

  const exchangeCard = () => {
    const updatedPlayers = [...players];
    const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer);
    const currentPlayerObj = updatedPlayers[currentPlayerIndex];
    let newDeck = deck;
    
    if (currentPlayerObj.isDealer) {
      // Dealer exchanges with deck
      const newCard = deck[0];
      newDeck = deck.slice(1);
      currentPlayerObj.card = newCard;
      currentPlayerObj.cardRevealed = newCard.value === 'K';
      currentPlayerObj.hasKing = newCard.value === 'K';
      setDeck(newDeck);
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
      }
    }
    
    currentPlayerObj.hasActed = true;
    setPlayers(updatedPlayers);
    
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
    saveGameState(gameData);
    
    moveToNextPlayer();
  };

  const moveToNextPlayer = () => {
    const updatedPlayers = [...players];
    const currentPlayerIndex = updatedPlayers.findIndex(p => p.id === currentPlayer);
    updatedPlayers[currentPlayerIndex].hasActed = true;
    setPlayers(updatedPlayers);
    
    setTimeout(processNextPlayer, 300);
  };

  const endRound = () => {
    setRevealCards(true);
    window.roundEndTime = Date.now(); // Track when round ends to prevent polling from clearing revealCards
    
    // Find lowest card value - only consider active (non-eliminated) players
    const activePlayers = players.filter(p => !p.eliminated && p.card);
    
    if (activePlayers.length === 0) {
      return;
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
    
    setPlayers(updatedPlayers);
    setRoundResult({
      lowestValue,
      losers: losers.map(p => p.name),
      eliminatedPlayers: losers.filter(p => p.chips === 1).map(p => p.name)
    });
    
    // Check for winner
    const remainingPlayers = updatedPlayers.filter(p => !p.eliminated && p.chips > 0);
    if (remainingPlayers.length === 1) {
      setWinner(remainingPlayers[0].name);
      setGameState('gameOver');
    }
    
    // Save updated game state with revealed cards
    const gameData = {
      gameId: gameId,
      players: updatedPlayers,
      gameState: remainingPlayers.length === 1 ? 'gameOver' : 'playing',
      numPlayers: numPlayers,
      hostId: players.find(p => p.isHost)?.id || 0,
      currentPlayer: currentPlayer,
      deck: deck,
      revealCards: true
    };
    saveGameState(gameData);
  };

  const nextRound = () => {
    // Move dealer to next active player
    const activePlayers = players.filter(p => !p.eliminated);
    
    if (activePlayers.length === 0) {
      return;
    }
    
    let currentDealerIndex = activePlayers.findIndex(p => p.isDealer);
    
    // If no current dealer found among active players, start with first active player
    if (currentDealerIndex === -1) {
      currentDealerIndex = 0;
    }
    
    const nextDealerIndex = (currentDealerIndex + 1) % activePlayers.length;
    
    const updatedPlayers = players.map(player => ({
      ...player,
      isDealer: player.id === activePlayers[nextDealerIndex].id
    }));
    
    
    
    // Reset round state
    setRoundResult(null);
    setRevealCards(false);
    window.gameStartTime = Date.now(); // Reset timer to prevent polling conflicts
    
    dealNewRound(updatedPlayers, deck);
  };

  const resetGame = () => {
    // Clear game data if we have a gameId
    if (gameId) {
      // Clear localStorage (fallback storage)
      localStorage.removeItem(`game_${gameId}`);
      // Clear sessionStorage for this tab
      sessionStorage.removeItem(`myTabId_${gameId}`);
      sessionStorage.removeItem(`myPlayerId_${gameId}`);
      sessionStorage.removeItem(`myPlayerName_${gameId}`);
    }
    
    setGameState('setup');
    setPlayers([]);
    setCurrentPlayer(0);
    setRevealCards(false);
    setRoundResult(null);
    setWinner(null);
    setHostName('');
    setPlayerName('');
    setIsHost(false);
    setGameId(null);
    setJoinGameId('');
    setShowJoinForm(false);
    setMyPlayerId(null);
  };



  // Load myPlayerId on component mount
  useEffect(() => {
    if (gameId) {
      const savedPlayerId = sessionStorage.getItem(`myPlayerId_${gameId}`);
      if (savedPlayerId !== null) {
        setMyPlayerId(parseInt(savedPlayerId));
      }
    }
  }, [gameId]);

  // Load game state on component mount
  useEffect(() => {
    // Listen for localStorage changes (when other tabs update the game)
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('game_') && e.newValue) {
        const gameData = JSON.parse(e.newValue);
        if (gameData.gameId === gameId) {
          setPlayers(gameData.players);
          setGameState(gameData.gameState);
          setNumPlayers(gameData.numPlayers);
          if (gameData.currentPlayer !== undefined) {
            setCurrentPlayer(gameData.currentPlayer);
          }
          if (gameData.deck) {
            setDeck(gameData.deck);
          }
          if (gameData.revealCards !== undefined) {
            setRevealCards(gameData.revealCards);
          }
          
          // Keep current myPlayerId from sessionStorage (don't override from other tabs)
          // sessionStorage is unique per tab, so we don't need to restore from localStorage
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameId]);

  // Auto-skip players who should be skipped
  useEffect(() => {
    if (gameState !== 'playing' || !players.length || revealCards) return;
    
    const currentPlayerObj = players.find(p => p.id === currentPlayer);
    if (currentPlayerObj && !currentPlayerObj.hasActed && shouldSkipPlayer(currentPlayerObj, players)) {
      const updatedPlayers = players.map(p => 
        p.id === currentPlayer ? { ...p, hasActed: true } : p
      );
      setPlayers(updatedPlayers);
      
      // Save updated game state with skipped player
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
      saveGameState(gameData);
      
      // Continue to next player after a brief delay
      setTimeout(() => {
        processNextPlayerWithUpdatedState(updatedPlayers);
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentPlayer, players, revealCards, gameId, numPlayers, deck]);

  // Poll for game state changes to ensure synchronization
  useEffect(() => {
    if (!gameId || gameState === 'setup') return;
    
    // Add a delay before starting polling to let the initial state settle
    const startPolling = setTimeout(() => {
      const pollGameState = async () => {
        try {
          const gameData = await loadGameState(gameId);
          if (gameData && gameData.gameState !== 'setup') {
            // Sync game state changes
            if (gameData.gameState !== gameState) {
              console.log('Game state changed from', gameState, 'to', gameData.gameState);
              setGameState(gameData.gameState);
            }
            
            // Sync players (always sync if gameData has players to ensure cards are updated)
            if (gameData.players) {
              // Check if players data has changed (length or cards)
              const playersChanged = gameData.players.length !== players.length ||
                gameData.players.some(gp => {
                  const localPlayer = players.find(p => p.id === gp.id);
                  return !localPlayer || localPlayer.card !== gp.card || localPlayer.chips !== gp.chips;
                });
              
              if (playersChanged) {
                console.log('Players data changed, syncing:', gameData.players.length, 'players');
                console.log('New players data:', gameData.players.map(p => ({ id: p.id, name: p.name, card: p.card?.value || 'none' })));
                console.log('My current myPlayerId:', myPlayerId);
                console.log('Current players state:', players.map(p => ({ id: p.id, name: p.name, card: p.card?.value || 'none' })));
                
                // Force a completely new array with new object references to trigger React re-render
                const newPlayers = gameData.players.map(p => ({ ...p }));
                setPlayers(newPlayers);
                
                // Also force a state update to trigger re-render
                setGameState(gameData.gameState);
              }
            }
            
            // Sync other critical game data when transitioning to playing
            if (gameData.gameState === 'playing' && gameState !== 'playing') {
              console.log('Syncing game transition to playing state');
              setDeck(gameData.deck || []);
              setCurrentPlayer(gameData.currentPlayer || 0);
              setRevealCards(gameData.revealCards || false);
              setNumPlayers(gameData.numPlayers || 4);
              
              // Ensure myPlayerId is correct
              const savedPlayerId = sessionStorage.getItem(`myPlayerId_${gameId}`);
              if (savedPlayerId !== null) {
                const targetId = parseInt(savedPlayerId);
                console.log('Current myPlayerId:', myPlayerId, 'Saved myPlayerId:', targetId);
                if (targetId !== myPlayerId) {
                  console.log('Updating myPlayerId from', myPlayerId, 'to', targetId);
                  setMyPlayerId(targetId);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling game state:', error);
        }
      };
      
      const interval = setInterval(pollGameState, 2000);
      
      // Store interval reference to clear it later
      return interval;
    }, 3000); // 3 second delay before starting polling
    
    return () => {
      clearTimeout(startPolling);
    };
  }, [gameId, gameState, currentPlayer, revealCards, players, myPlayerId]);

  const renderCard = (card, isRevealed, isSmall = false) => {
    if (!card) return null;
    
    const sizeClass = isSmall ? 'w-12 h-16 text-xs' : 'w-16 h-24 text-sm';
    const color = (card.suit === '♥' || card.suit === '♦') ? 'text-red-500' : 'text-black';
    
    return (
      <div className={`${sizeClass} bg-white border-2 border-gray-300 rounded-lg flex flex-col justify-between p-1 shadow-md`}>
        {isRevealed ? (
          <>
            <div className={`${color} font-bold`}>{card.value}</div>
            <div className={`${color} text-center text-lg`}>{card.suit}</div>
            <div className={`${color} font-bold transform rotate-180 self-end`}>{card.value}</div>
          </>
        ) : (
          <div className="w-full h-full bg-blue-800 rounded flex items-center justify-center">
            <div className="text-white text-xs">?</div>
          </div>
        )}
      </div>
    );
  };

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-green-800">
            Screw Your Neighbor
          </h1>
          
          {!showJoinForm ? (
            // Create Game Form
            <div>
              <div className="mb-6">
                <div className="flex justify-center space-x-4 mb-6">
                  <button
                    className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold"
                  >
                    Create Game
                  </button>
                  <button
                    onClick={() => setShowJoinForm(true)}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Join Game
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Players (2-6)
                </label>
                <select
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {[2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} Players</option>
                  ))}
                </select>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold mb-2">Game Rules:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Each player starts with 3 chips</li>
                  <li>• Lowest card each round loses a chip</li>
                  <li>• Kings are revealed and cannot be exchanged</li>
                  <li>• Aces = 1 (lowest value)</li>
                  <li>• Ties: all tied players lose a chip</li>
                  <li>• Last player with chips wins!</li>
                </ul>
              </div>
              
              <button
                onClick={createGame}
                disabled={!hostName.trim()}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  hostName.trim() 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Game
              </button>
            </div>
          ) : (
            // Join Game Form
            <div>
              <div className="mb-6">
                <div className="flex justify-center space-x-4 mb-6">
                  <button
                    onClick={() => setShowJoinForm(false)}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Create Game
                  </button>
                  <button
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold"
                  >
                    Join Game
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game ID
                </label>
                <input
                  type="text"
                  value={joinGameId}
                  onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="Enter Game ID (e.g., ABC123)"
                  maxLength={6}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <button
                onClick={joinGame}
                disabled={!playerName.trim() || !joinGameId.trim()}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                  playerName.trim() && joinGameId.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Join Game
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-green-800">
            Waiting Room
          </h1>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Game Info</h3>
            <p className="text-sm text-gray-600">
              Game ID: <span className="font-mono font-bold">{gameId}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Players: {players.length}/{numPlayers}
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Players in Game:</h3>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{player.name}</span>
                  <div className="flex items-center gap-2">
                    {player.isHost && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Host</span>}
                    {player.isDealer && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Dealer</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-center">
              {players.length < numPlayers 
                ? `Waiting for ${numPlayers - players.length} more player${numPlayers - players.length > 1 ? 's' : ''}...`
                : 'All players have joined!'
              }
            </p>
          </div>
          
          {isHost && (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                players.length >= 2
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
            </button>
          )}
          
          {!isHost && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Waiting for host to start the game...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4 text-green-800">Game Over!</h1>
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            {winner} Wins!
          </h2>
          <button
            onClick={resetGame}
            className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const currentPlayerObj = players.find(p => p.id === currentPlayer);
  const shouldShowControls = currentPlayerObj && !revealCards && !currentPlayerObj.hasActed && 
    !shouldSkipPlayer(currentPlayerObj, players) && currentPlayer === myPlayerId;
  const canExchange = currentPlayerObj && !currentPlayerObj.isDealer ? 
    !getLeftNeighbor(players, currentPlayer)?.hasKing : true;

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-green-800">Screw Your Neighbor</h1>
            <button
              onClick={resetGame}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={16} />
              New Game
            </button>
          </div>
          
          {/* Debug Panel */}
          <div className="bg-yellow-100 p-3 mb-4 rounded border">
            <div className="text-sm">
              <strong>DEBUG:</strong> myPlayerId={myPlayerId}, players.length={players.length}
              <br />
              <strong>Players:</strong> {players.map(p => `${p.name}(id:${p.id}, card:${p.card?.value || 'none'})`).join(', ')}
              <br />
              <strong>My Player:</strong> {players.find(p => p.id === myPlayerId)?.name || 'not found'} - Card: {players.find(p => p.id === myPlayerId)?.card?.value || 'none'}
            </div>
          </div>
          
          <div className="relative bg-green-600 rounded-full mx-auto mb-6" style={{ width: '600px', height: '400px' }}>
            {/* Card table surface */}
            <div className="absolute inset-4 bg-green-700 rounded-full border-4 border-amber-600 shadow-inner">
              {/* Table felt pattern */}
              <div className="absolute inset-0 rounded-full opacity-20" 
                   style={{ 
                     background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.1) 70%)'
                   }}>
              </div>
              
              {/* Deck in center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-16 h-24 bg-blue-800 border-2 border-gray-300 rounded-lg flex items-center justify-center shadow-lg">
                  <Shuffle className="text-white" size={20} />
                </div>
                <div className="text-center text-white text-xs mt-1">
                  {deck.length} cards
                </div>
              </div>
            </div>
            
            {/* Players positioned around the table */}
            {players.map((player, index) => {
              const position = getPlayerPosition(index, players.length);
              const isCurrentPlayer = player.id === currentPlayer && !revealCards;
              
              return (
                <div
                  key={`${player.id}-${player.card?.value || 'no-card'}-${player.chips}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                >
                  <div
                    className={`p-3 rounded-lg border-2 transition-all bg-white shadow-lg ${
                      player.eliminated 
                        ? 'border-gray-300 opacity-50' 
                        : isCurrentPlayer
                        ? 'border-yellow-400 shadow-xl ring-2 ring-yellow-300'
                        : 'border-gray-300'
                    }`}
                    style={{ minWidth: '120px' }}
                  >
                    <div className="text-center">
                      <div className="font-semibold text-sm mb-2">
                        {player.name}
                        {player.isDealer && <div className="text-blue-600 text-xs">(Dealer)</div>}
                      </div>
                      
                      <div className="mb-2">
                        <div className="text-xs text-gray-600">Chips:</div>
                        <div className="flex justify-center gap-1">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-4 rounded-full ${
                                i < player.chips ? 'bg-red-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {player.card && (
                        <div className="flex justify-center">
                          {renderCard(
                            player.card, 
                            revealCards || player.cardRevealed || player.id === myPlayerId, 
                            true
                          )}
                          {/* Debug info */}
                          <div className="text-xs text-red-500 mt-1">
                            P{player.id}: card={player.card?.value}, myId={myPlayerId}, canSee={player.id === myPlayerId ? 'YES' : 'NO'}
                          </div>
                        </div>
                      )}
                      
                      {player.eliminated && (
                        <div className="text-red-600 font-semibold text-xs mt-1">OUT</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {shouldShowControls && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">
                  {currentPlayerObj.name}'s Turn
                </h3>
                <p className="text-sm text-gray-600">
                  {currentPlayerObj.isDealer 
                    ? 'Exchange with deck or keep your card'
                    : `Exchange with ${getLeftNeighbor(players, currentPlayer)?.name} or keep your card`
                  }
                </p>
              </div>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={keepCard}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Keep Card
                </button>
                <button
                  onClick={exchangeCard}
                  disabled={!canExchange}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    canExchange
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Exchange Card
                  {!canExchange && <span className="block text-xs">(King blocks exchange)</span>}
                </button>
              </div>
            </div>
          )}
          
          {!shouldShowControls && !revealCards && currentPlayerObj && (
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <p className="text-gray-600">
                {currentPlayerObj.hasKing 
                  ? `${currentPlayerObj.name} has a King - turn skipped automatically`
                  : shouldSkipPlayer(currentPlayerObj, players)
                  ? `${currentPlayerObj.name}'s turn skipped - cannot exchange with King holder`
                  : `Waiting for ${currentPlayerObj.name}...`
                }
              </p>
            </div>
          )}
          
          {roundResult && (
            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-lg mb-2">Round Results</h3>
              <p className="mb-2">
                Lowest card: <span className="font-bold">{roundResult.lowestValue}</span>
              </p>
              <p className="mb-2">
                Players who lost a chip: <span className="font-bold">{roundResult.losers.join(', ')}</span>
              </p>
              {roundResult.eliminatedPlayers.length > 0 && (
                <p className="text-red-600 font-semibold">
                  Eliminated: {roundResult.eliminatedPlayers.join(', ')}
                </p>
              )}
            </div>
          )}
          
          
          {revealCards && !winner && (
            <div className="text-center">
              {isHost ? (
                <button
                  onClick={nextRound}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Next Round
                </button>
              ) : (
                <div className="text-gray-600">
                  Waiting for host to start next round...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrewYourNeighborGame;