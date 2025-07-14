import { useEffect } from 'react';
import { saveGameState, loadGameState } from '../services/gameService';
import { subscribeToActivityLog, addActivityEntry } from '../services/activityLogService';

export const useMultiplayer = ({
  gameId,
  gameState,
  setGameState,
  players,
  setPlayers,
  setNumPlayers,
  currentPlayer,
  setCurrentPlayer,
  deck,
  setDeck,
  revealCards,
  setRevealCards,
  myPlayerId,
  setMyPlayerId,
  activityLog,
  setActivityLog,
  setActivityLogError,
  activityLogRef,
  numPlayers,
  shouldSkipPlayer,
  processNextPlayerWithUpdatedState
}) => {

  // Load myPlayerId on component mount
  useEffect(() => {
    if (gameId) {
      const savedPlayerId = sessionStorage.getItem(`myPlayerId_${gameId}`);
      if (savedPlayerId !== null) {
        setMyPlayerId(parseInt(savedPlayerId));
      }
    }
  }, [gameId, setMyPlayerId]);

  // Listen for localStorage changes (when other tabs update the game)
  useEffect(() => {
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
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameId, setPlayers, setGameState, setNumPlayers, setCurrentPlayer, setDeck, setRevealCards]);

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
                // Force a completely new array with new object references to trigger React re-render
                const newPlayers = gameData.players.map(p => ({ ...p }));
                setPlayers(newPlayers);
                
                // Also force a state update to trigger re-render
                setGameState(gameData.gameState);
              }
            }
            
            // Sync other critical game data when transitioning to playing
            if (gameData.gameState === 'playing' && gameState !== 'playing') {
              setDeck(gameData.deck || []);
              setCurrentPlayer(gameData.currentPlayer || 0);
              setRevealCards(gameData.revealCards || false);
              setNumPlayers(gameData.numPlayers || 4);
              
              // Ensure myPlayerId is correct
              const savedPlayerId = sessionStorage.getItem(`myPlayerId_${gameId}`);
              if (savedPlayerId !== null) {
                const targetId = parseInt(savedPlayerId);
                if (targetId !== myPlayerId) {
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
  }, [gameId, gameState, currentPlayer, revealCards, players, myPlayerId, setGameState, setPlayers, setDeck, setCurrentPlayer, setRevealCards, setNumPlayers, setMyPlayerId]);

  // Subscribe to activity log updates
  useEffect(() => {
    if (!gameId) {
      setActivityLog([]);
      setActivityLogError(null);
      return;
    }

    setActivityLogError(null);

    const unsubscribe = subscribeToActivityLog(gameId, (entries) => {
      setActivityLog(entries);
      setActivityLogError(null);
    });

    return unsubscribe;
  }, [gameId, setActivityLog, setActivityLogError]);

  // Auto-scroll to newest activity entries
  useEffect(() => {
    if (activityLogRef.current && activityLog.length > 0) {
      const scrollContainer = activityLogRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [activityLog, activityLogRef]);

  // Helper function to add activity log entries
  const logActivity = (action, type = 'action') => {
    if (gameId && myPlayerId !== null) {
      const playerName = players.find(p => p.id === myPlayerId)?.name || 'Unknown Player';
      addActivityEntry(gameId, myPlayerId, playerName, action, type);
    }
  };

  return {
    logActivity
  };
};