import React from 'react';

// Card suits and values
export const suits = ['♠', '♥', '♦', '♣'];
export const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Get numeric value of a card for comparison
export const getCardValue = (card) => {
  if (!card) return 0;
  if (card.value === 'A') return 1;
  if (card.value === 'J') return 11;
  if (card.value === 'Q') return 12;
  if (card.value === 'K') return 13;
  return parseInt(card.value);
};

// Create a new deck of cards
export const createDeck = () => {
  const newDeck = [];
  for (let suit of suits) {
    for (let value of values) {
      newDeck.push({ suit, value });
    }
  }
  return shuffleDeck(newDeck);
};

// Shuffle a deck of cards using Fisher-Yates algorithm
export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Render a card component
export const renderCard = (card, isRevealed, isSmall = false) => {
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
          <div className="text-white text-xs font-bold">🂠</div>
        </div>
      )}
    </div>
  );
};