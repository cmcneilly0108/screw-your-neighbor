import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { useMultiplayer } from './hooks/useMultiplayer';
import { saveGameState } from './services/gameService';
import { 
  shouldSkipPlayer, 
  dealNewRound, 
  keepCard as keepCardLogic, 
  exchangeCard as exchangeCardLogic, 
  endRound, 
  nextRound 
} from './services/gameLogic';
import { renderCard } from './services/cardUtils';
import { 
  getPlayerPosition, 
  createGame as createGameLogic, 
  joinGame as joinGameLogic, 
  resetGame as resetGameLogic,
  getLeftNeighbor 
} from './services/playerUtils';

const ScrewYourNeighborGame = () => {
  // Use custom hooks for state management
  const gameStateHook = useGameState();
  const {
    gameState, setGameState,
    numPlayers, setNumPlayers,
    players, setPlayers,
    currentPlayer, setCurrentPlayer,
    deck, setDeck,
    revealCards, setRevealCards,
    roundResult, setRoundResult,
    winner, setWinner,
    hostName, setHostName,
    playerName, setPlayerName,
    isHost, setIsHost,
    gameId, setGameId,
    joinGameId, setJoinGameId,
    showJoinForm, setShowJoinForm,
    myPlayerId, setMyPlayerId,
    activityLog, setActivityLog,
    activityLogError, setActivityLogError,
    activityLogRef,
    resetAllState
  } = gameStateHook;

  // Original processNextPlayer logic from backup
  const processNextPlayer = () => {
    const activePlayers = players.filter(p => !p.eliminated);
    const allPlayersActed = activePlayers.every(p => p.hasActed);
    
    if (allPlayersActed) {
      // End the round - set reveal cards first to hide action buttons immediately
      setRevealCards(true);
      window.roundEndTime = Date.now(); // Track when round ends to prevent polling from clearing revealCards
      
      const { players: endedPlayers, roundResult: result } = endRound(players);
      setPlayers(endedPlayers);
      setRoundResult(result);
      
      // Save the revealed cards state to Firebase immediately
      const remainingPlayersForSave = endedPlayers.filter(p => !p.eliminated && p.chips > 0);
      const isGameOver = remainingPlayersForSave.length <= 1;
      
      const gameData = {
        gameId: gameId,
        players: endedPlayers,
        gameState: isGameOver ? 'gameOver' : 'playing',
        numPlayers: numPlayers,
        hostId: players.find(p => p.isHost)?.id || 0,
        currentPlayer: currentPlayer,
        deck: deck,
        revealCards: true // Important: save the revealed state
      };
      saveGameState(gameData);
      
      // Log round results
      const loserNames = result.losers.join(', ');
      logActivity(`📉 Round ended! Lowest card: ${result.lowestValue}. ${loserNames} lost a chip.`, 'round');
      
      if (result.eliminatedPlayers.length > 0) {
        logActivity(`💀 ${result.eliminatedPlayers.join(', ')} eliminated!`, 'system');
      }
      
      // Check for winner - inline like original
      const remainingPlayers = endedPlayers.filter(p => !p.eliminated && p.chips > 0);
      if (remainingPlayers.length === 1) {
        setWinner(remainingPlayers[0].name);
        setGameState('gameOver');
        logActivity(`🏆 ${remainingPlayers[0].name} wins the game!`, 'system');
      } else if (remainingPlayers.length === 0) {
        setWinner("TIE GAME");
        setGameState('gameOver');
        logActivity(`🤝 Game ended in a tie! All remaining players eliminated.`, 'system');
      }
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
        currentPlayer: currentPlayer,
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

  const processNextPlayerWithUpdatedState = (updatedPlayers) => {
    const activePlayers = updatedPlayers.filter(p => !p.eliminated);
    const allPlayersActed = activePlayers.every(p => p.hasActed);
    
    if (allPlayersActed) {
      // End the round - set reveal cards first to hide action buttons immediately
      setRevealCards(true);
      window.roundEndTime = Date.now(); // Track when round ends to prevent polling from clearing revealCards
      
      const { players: endedPlayers, roundResult: result } = endRound(updatedPlayers);
      setPlayers(endedPlayers);
      setRoundResult(result);
      
      // Save the revealed cards state to Firebase immediately
      const remainingPlayersForSave = endedPlayers.filter(p => !p.eliminated && p.chips > 0);
      const isGameOver = remainingPlayersForSave.length <= 1;
      
      const gameData = {
        gameId: gameId,
        players: endedPlayers,
        gameState: isGameOver ? 'gameOver' : 'playing',
        numPlayers: numPlayers,
        hostId: updatedPlayers.find(p => p.isHost)?.id || 0,
        currentPlayer: currentPlayer,
        deck: deck,
        revealCards: true // Important: save the revealed state
      };
      saveGameState(gameData);
      
      // Log round results
      const loserNames = result.losers.join(', ');
      logActivity(`📉 Round ended! Lowest card: ${result.lowestValue}. ${loserNames} lost a chip.`, 'round');
      
      if (result.eliminatedPlayers.length > 0) {
        logActivity(`💀 ${result.eliminatedPlayers.join(', ')} eliminated!`, 'system');
      }
      
      // Check for winner - inline like original
      const remainingPlayers = endedPlayers.filter(p => !p.eliminated && p.chips > 0);
      if (remainingPlayers.length === 1) {
        setWinner(remainingPlayers[0].name);
        setGameState('gameOver');
        logActivity(`🏆 ${remainingPlayers[0].name} wins the game!`, 'system');
      } else if (remainingPlayers.length === 0) {
        setWinner("TIE GAME");
        setGameState('gameOver');
        logActivity(`🤝 Game ended in a tie! All remaining players eliminated.`, 'system');
      }
      return;
    }
    
    // Find next player who hasn't acted
    const currentIndex = activePlayers.findIndex(p => p.id === currentPlayer);
    let nextIndex = (currentIndex + 1) % activePlayers.length;
    
    while (activePlayers[nextIndex].hasActed) {
      nextIndex = (nextIndex + 1) % activePlayers.length;
    }
    
    const nextPlayer = activePlayers[nextIndex];
    setCurrentPlayer(nextPlayer.id);
  };

  // Use multiplayer hook
  const { logActivity } = useMultiplayer({
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
  });

  // Game actions
  const createGame = async () => {
    const result = await createGameLogic(hostName, numPlayers);
    if (result) {
      setGameId(result.gameId);
      setPlayers(result.players);
      setIsHost(result.isHost);
      setMyPlayerId(result.myPlayerId);
      setGameState('waiting');
    }
  };

  const joinGame = async () => {
    const result = await joinGameLogic(playerName, joinGameId);
    if (result.error) {
      alert(result.error);
      return;
    }
    
    setGameId(result.gameId);
    setPlayers(result.players);
    setIsHost(result.isHost);
    setMyPlayerId(result.myPlayerId);
    setGameState(result.gameState);
    setNumPlayers(result.numPlayers);
    setPlayerName('');
    setJoinGameId('');
    setShowJoinForm(false);
  };

  const startGame = () => {
    if (players.length < 2) return;
    
    setGameState('playing');
    logActivity(`🎮 Game started with ${players.length} players!`, 'system');
    window.gameStartTime = Date.now();
    dealNewRound(players, gameId, numPlayers).then(result => {
      setPlayers(result.players);
      setDeck(result.deck);
      setCurrentPlayer(result.currentPlayer);
      setRevealCards(false);
      setRoundResult(null);
    });
  };

  const keepCard = async () => {
    const result = await keepCardLogic(players, currentPlayer, gameId, numPlayers, deck, revealCards);
    setPlayers(result.players);
    logActivity('🤝 kept their card');
    
    setTimeout(processNextPlayer, 300);
  };

  const exchangeCard = async () => {
    const result = await exchangeCardLogic(players, currentPlayer, deck, gameId, numPlayers, revealCards);
    setPlayers(result.players);
    setDeck(result.deck);
    
    if (result.exchangeInfo) {
      if (result.exchangeInfo.type === 'deck') {
        logActivity('🔄 exchanged with the deck');
      } else {
        logActivity(`🔄 exchanged cards with ${result.exchangeInfo.playerName}`);
      }
    }
    
    setTimeout(processNextPlayer, 300);
  };

  const nextRoundAction = () => {
    const { players: updatedPlayers, newDealerName } = nextRound(players);
    setPlayers(updatedPlayers);
    
    if (newDealerName) {
      logActivity(`🃏 New round started! ${newDealerName} is now the dealer.`, 'system');
    }
    
    setRoundResult(null);
    setRevealCards(false);
    
    dealNewRound(updatedPlayers, gameId, numPlayers).then(result => {
      setPlayers(result.players);
      setDeck(result.deck);
      setCurrentPlayer(result.currentPlayer);
    });
  };

  const resetGame = () => {
    const resetState = resetGameLogic();
    Object.keys(resetState).forEach(key => {
      const setter = gameStateHook[`set${key.charAt(0).toUpperCase()}${key.slice(1)}`];
      if (setter) {
        setter(resetState[key]);
      }
    });
    resetAllState();
  };

  // UI logic
  const currentPlayerObj = players.find(p => p.id === currentPlayer);
  const shouldShowControls = gameState === 'playing' && !revealCards && currentPlayerObj && 
    !shouldSkipPlayer(currentPlayerObj, players) && currentPlayer === myPlayerId;
  const canExchange = currentPlayerObj && !currentPlayerObj.isDealer ? 
    !getLeftNeighbor(players, currentPlayer)?.hasKing : true;

  // Handle setup screen separately with proper layout
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
                  <button className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold">
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
                  <button className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold">
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
                    {player.id === myPlayerId && <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">You</span>}
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
              {players.length >= 2 ? 'Start Game' : 'Need at least 2 players'}
            </button>
          )}
          
          {!isHost && (
            <div className="text-center text-gray-600">
              Waiting for host to start the game...
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
            {winner === "TIE GAME" ? (
              <span className="text-orange-600">🤝 It's a Tie!</span>
            ) : (
              <span>{winner} Wins!</span>
            )}
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

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-4">
          {/* Main game area */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-green-800">Screw Your Neighbor</h1>
            {gameState === 'gameOver' && (
              <button
                onClick={resetGame}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RotateCcw size={16} />
                New Game
              </button>
            )}
          </div>



          {gameState === 'playing' && (
            <div>
            <div className="relative bg-green-600 rounded-full mx-auto mb-6" style={{ width: '600px', height: '400px' }}>
            {players.map((player, index) => {
              const position = getPlayerPosition(index, players.length);
              return (
                <div
                  key={`${player.id}-${player.card?.value || 'no-card'}-${player.chips}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  <div className="text-center">
                    <div className={`mb-2 p-2 rounded-lg ${
                      currentPlayer === player.id && !revealCards ? 'bg-yellow-200 ring-2 ring-yellow-400' : 'bg-white'
                    }`}>
                      <div className="text-sm font-semibold">{player.name}</div>
                      {player.id === myPlayerId && <div className="text-xs text-blue-600">(You)</div>}
                      {player.isDealer && <div className="text-xs text-purple-600 font-semibold">DEALER</div>}
                      
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
                      
                      {player.eliminated && (
                        <div className="text-red-600 font-semibold text-xs mt-1">OUT</div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      {player.card && renderCard(
                        player.card, 
                        revealCards || player.cardRevealed || player.id === myPlayerId,
                        true
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
                  onClick={nextRoundAction}
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
          )}
          </div>
          </div>
          
          {/* Activity Log Panel */}
          <div className="w-80">
            <div className="bg-white rounded-lg shadow-xl p-4 sticky top-4">
              <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2 border-b-2 border-green-200 pb-2">
                📋 Activity Log
                {activityLog.length > 0 && (
                  <span className="text-sm font-normal text-green-600 ml-auto">
                    {activityLog.length} entries
                  </span>
                )}
              </h3>
              <div ref={activityLogRef} className="h-96 overflow-y-auto space-y-2">
                {activityLogError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-2">
                    Connection error: {activityLogError}
                  </div>
                )}
                
                {gameId && (
                  <div className="text-xs text-gray-400 mb-2">
                    Connected to: {gameId}
                  </div>
                )}
                
                {activityLog.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    {gameId ? 'Waiting for activity...' : 'No game active'}
                  </div>
                ) : (
                  activityLog.map((entry) => {
                    const typeStyles = {
                      'system': 'bg-blue-50 border-l-4 border-blue-400 text-blue-800',
                      'round': 'bg-orange-50 border-l-4 border-orange-400 text-orange-800',
                      'action': 'bg-gray-50 border-l-4 border-gray-300 text-gray-800'
                    };
                    const bgClass = typeStyles[entry.type] || typeStyles['action'];
                    
                    return (
                      <div key={entry.id} className={`${bgClass} p-3 rounded-lg text-sm transition-all duration-300 hover:shadow-md transform hover:scale-[1.02] animate-fadeIn`}>
                        <div className="text-xs opacity-75 mb-1">{entry.displayTime}</div>
                        <div className="font-medium">
                          {entry.type === 'system' ? (
                            <span>{entry.action}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">{entry.playerName}</span> {entry.action}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrewYourNeighborGame;