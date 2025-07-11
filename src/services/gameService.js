import { database } from '../firebase';
import { ref, set, get, onValue } from 'firebase/database';

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  try {
    // Simple check - if database exists and we can create a reference, Firebase is configured
    if (!database) return false;
    
    // Try to create a test reference - this will work if Firebase is properly configured
    const testRef = ref(database, 'test');
    return testRef && testRef.toString().includes('screw-your-neighbor-game');
  } catch (error) {
    console.error('Firebase configuration check failed:', error);
    return false;
  }
};

// Fallback to localStorage if Firebase not configured
const saveToLocalStorage = (gameData) => {
  localStorage.setItem(`game_${gameData.gameId}`, JSON.stringify(gameData));
  return true;
};

const loadFromLocalStorage = (gameId) => {
  const gameData = localStorage.getItem(`game_${gameId}`);
  return gameData ? JSON.parse(gameData) : null;
};

// Save game state to Firebase or localStorage
export const saveGameState = async (gameData) => {
  console.log('Saving game state for gameId:', gameData.gameId);
  
  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured, using localStorage');
    return saveToLocalStorage(gameData);
  }
  
  try {
    console.log('Attempting to save to Firebase...');
    const gameRef = ref(database, `games/${gameData.gameId}`);
    await set(gameRef, {
      ...gameData,
      lastUpdated: Date.now()
    });
    console.log('Successfully saved to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving game state to Firebase:', error);
    console.log('Falling back to localStorage');
    // Fallback to localStorage
    return saveToLocalStorage(gameData);
  }
};

// Load game state from Firebase or localStorage
export const loadGameState = async (gameId) => {
  if (!isFirebaseConfigured()) {
    return loadFromLocalStorage(gameId);
  }
  
  try {
    const gameRef = ref(database, `games/${gameId}`);
    const snapshot = await get(gameRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error loading game state:', error);
    // Fallback to localStorage
    return loadFromLocalStorage(gameId);
  }
};

// Listen for real-time game state changes
export const subscribeToGameState = (gameId, callback) => {
  if (!isFirebaseConfigured()) {
    // Fallback to localStorage polling for non-Firebase setup
    const pollInterval = setInterval(() => {
      const gameData = loadFromLocalStorage(gameId);
      if (gameData) {
        callback(gameData);
      }
    }, 2000);
    
    return () => clearInterval(pollInterval);
  }
  
  try {
    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to game state:', error);
    return null;
  }
};

// Unsubscribe from game state changes
export const unsubscribeFromGameState = (unsubscribe) => {
  if (unsubscribe) {
    unsubscribe();
  }
};

// Delete game (optional - for cleanup)
export const deleteGame = async (gameId) => {
  try {
    const gameRef = ref(database, `games/${gameId}`);
    await set(gameRef, null);
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    return false;
  }
};