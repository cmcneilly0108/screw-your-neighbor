import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Add a new activity log entry
export const addActivityEntry = async (gameId, playerId, playerName, action, type = 'action') => {
  try {
    const activityRef = collection(db, 'activityLogs', gameId, 'entries');
    const docData = {
      playerId,
      playerName,
      action,
      type,
      timestamp: serverTimestamp(),
      createdAt: Date.now() // Fallback for sorting if serverTimestamp is pending
    };
    
    await addDoc(activityRef, docData);
    return true;
  } catch (error) {
    console.error('Error adding activity entry:', error);
    return false;
  }
};

// Subscribe to real-time activity log updates
export const subscribeToActivityLog = (gameId, callback) => {
  try {
    const activityRef = collection(db, 'activityLogs', gameId, 'entries');
    const q = query(activityRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to readable time if available
          displayTime: data.timestamp?.toDate ? 
            data.timestamp.toDate().toLocaleTimeString() : 
            new Date(data.createdAt).toLocaleTimeString()
        });
      });
      
      callback(entries);
    }, (error) => {
      console.error('Error listening to activity log:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to activity log:', error);
    return () => {}; // Return empty unsubscribe function
  }
};

// Clear activity log for a game (useful for testing)
export const clearActivityLog = async (gameId) => {
  try {
    // Note: This would require admin privileges or cloud functions in production
    // For now, we'll just rely on game resets creating new game IDs
    console.log('Activity log clear requested for game:', gameId);
    return true;
  } catch (error) {
    console.error('Error clearing activity log:', error);
    return false;
  }
};