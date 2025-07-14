import { useState, useRef } from 'react';

export const useGameState = () => {
  // Core game state
  const [gameState, setGameState] = useState('setup');
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [deck, setDeck] = useState([]);
  const [revealCards, setRevealCards] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [winner, setWinner] = useState(null);

  // Player/Host state
  const [hostName, setHostName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(null);

  // Activity log state
  const [activityLog, setActivityLog] = useState([]);
  const [activityLogError, setActivityLogError] = useState(null);
  const activityLogRef = useRef(null);

  // Reset all state to initial values
  const resetAllState = () => {
    setGameState('setup');
    setNumPlayers(4);
    setPlayers([]);
    setCurrentPlayer(0);
    setDeck([]);
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
    setActivityLog([]);
    setActivityLogError(null);
  };

  return {
    // Core game state
    gameState,
    setGameState,
    numPlayers,
    setNumPlayers,
    players,
    setPlayers,
    currentPlayer,
    setCurrentPlayer,
    deck,
    setDeck,
    revealCards,
    setRevealCards,
    roundResult,
    setRoundResult,
    winner,
    setWinner,

    // Player/Host state
    hostName,
    setHostName,
    playerName,
    setPlayerName,
    isHost,
    setIsHost,
    gameId,
    setGameId,
    joinGameId,
    setJoinGameId,
    showJoinForm,
    setShowJoinForm,
    myPlayerId,
    setMyPlayerId,

    // Activity log state
    activityLog,
    setActivityLog,
    activityLogError,
    setActivityLogError,
    activityLogRef,

    // Utilities
    resetAllState,
  };
};