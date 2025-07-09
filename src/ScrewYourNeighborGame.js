import React, { useState } from 'react';
import { Shuffle, RotateCcw } from 'lucide-react';

const ScrewYourNeighborGame = () => {
  const [gameState, setGameState] = useState('setup');
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [deck, setDeck] = useState([]);
  const [revealCards, setRevealCards] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [winner, setWinner] = useState(null);

  // Card suits and values
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const getCardValue = (card) => {
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
    setCurrentPlayer(nextPlayer.id);
    
    // If next player should be skipped, auto-skip them
    if (shouldSkipPlayer(nextPlayer, players)) {
      const updatedPlayers = players.map(p => 
        p.id === nextPlayer.id ? { ...p, hasActed: true } : p
      );
      setPlayers(updatedPlayers);
      
      // Continue to next player after a brief delay
      setTimeout(() => {
        setPlayers(current => {
          const updated = current.map(p => 
            p.id === nextPlayer.id ? { ...p, hasActed: true } : p
          );
          // Recursively process next player
          setTimeout(processNextPlayer, 100);
          return updated;
        });
      }, 800);
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

  const startGame = () => {
    const newPlayers = [];
    for (let i = 0; i < numPlayers; i++) {
      newPlayers.push({
        id: i,
        name: `Player ${i + 1}`,
        chips: 3,
        card: null,
        isDealer: i === 0,
        cardRevealed: false,
        hasKing: false,
        eliminated: false
      });
    }
    setPlayers(newPlayers);
    setGameState('playing');
    dealNewRound(newPlayers);
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
    setCurrentPlayer(nextPlayer.id);
    
    // If next player should be skipped, auto-skip them
    if (shouldSkipPlayer(nextPlayer, updatedPlayers)) {
      const newUpdatedPlayers = updatedPlayers.map(p => 
        p.id === nextPlayer.id ? { ...p, hasActed: true } : p
      );
      setPlayers(newUpdatedPlayers);
      
      // Continue to next player after a brief delay
      setTimeout(() => {
        processNextPlayerWithUpdatedState(newUpdatedPlayers);
      }, 800);
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
      if (player.eliminated) return player;
      
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
    const dealerIndex = currentPlayers.findIndex(p => p.isDealer);
    let nextPlayerIndex = (dealerIndex + 1) % currentPlayers.length;
    while (currentPlayers[nextPlayerIndex].eliminated) {
      nextPlayerIndex = (nextPlayerIndex + 1) % currentPlayers.length;
    }
    setCurrentPlayer(nextPlayerIndex);
    
    // Check for auto-skips after initial setup
    setTimeout(() => {
      const firstPlayer = updatedPlayers.find(p => p.id === nextPlayerIndex);
      if (shouldSkipPlayer(firstPlayer, updatedPlayers)) {
        const skippedPlayers = updatedPlayers.map(p => 
          p.id === nextPlayerIndex ? { ...p, hasActed: true } : p
        );
        setPlayers(skippedPlayers);
        setTimeout(() => processNextPlayerWithUpdatedState(skippedPlayers), 800);
      }
    }, 100);
  };

  const keepCard = () => {
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayer].hasActed = true;
    setPlayers(updatedPlayers);
    moveToNextPlayer();
  };

  const exchangeCard = () => {
    const updatedPlayers = [...players];
    const currentPlayerObj = updatedPlayers[currentPlayer];
    
    if (currentPlayerObj.isDealer) {
      // Dealer exchanges with deck
      const newCard = deck[0];
      const newDeck = deck.slice(1);
      currentPlayerObj.card = newCard;
      currentPlayerObj.cardRevealed = newCard.value === 'K';
      currentPlayerObj.hasKing = newCard.value === 'K';
      setDeck(newDeck);
    } else {
      // Exchange with left neighbor
      const leftNeighborIndex = (currentPlayer + 1) % players.length;
      const leftNeighbor = updatedPlayers[leftNeighborIndex];
      
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
    moveToNextPlayer();
  };

  const moveToNextPlayer = () => {
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayer].hasActed = true;
    setPlayers(updatedPlayers);
    
    setTimeout(processNextPlayer, 300);
  };

  const endRound = () => {
    setRevealCards(true);
    
    // Find lowest card value
    const activePlayers = players.filter(p => !p.eliminated);
    const lowestValue = Math.min(...activePlayers.map(p => getCardValue(p.card)));
    const losers = activePlayers.filter(p => getCardValue(p.card) === lowestValue);
    
    // Remove chips from losers
    const updatedPlayers = players.map(player => {
      if (losers.some(loser => loser.id === player.id)) {
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
  };

  const nextRound = () => {
    // Move dealer to next active player
    const activePlayers = players.filter(p => !p.eliminated);
    const currentDealerIndex = activePlayers.findIndex(p => p.isDealer);
    const nextDealerIndex = (currentDealerIndex + 1) % activePlayers.length;
    
    const updatedPlayers = players.map(player => ({
      ...player,
      isDealer: player.id === activePlayers[nextDealerIndex].id
    }));
    
    dealNewRound(updatedPlayers, deck);
  };

  const resetGame = () => {
    setGameState('setup');
    setPlayers([]);
    setCurrentPlayer(0);
    setRevealCards(false);
    setRoundResult(null);
    setWinner(null);
  };

  const renderCard = (card, isRevealed, isSmall = false) => {
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
            onClick={startGame}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Start Game
          </button>
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

  const currentPlayerObj = players[currentPlayer];
  const shouldShowControls = currentPlayerObj && !revealCards && !currentPlayerObj.hasActed && 
    !shouldSkipPlayer(currentPlayerObj, players);
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
                  key={player.id}
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
                          {renderCard(player.card, revealCards || player.cardRevealed || player.id === currentPlayer, true)}
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
              <button
                onClick={nextRound}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Next Round
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrewYourNeighborGame;