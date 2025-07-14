import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Add a new activity log entry
export const addActivityEntry = async (gameId, playerId, playerName, action, type = 'action') => {
  console.log(`🔥 Attempting to add activity entry:`, {
    gameId,
    playerId,
    playerName,
    action,
    type
  });
  
  try {
    const activityRef = collection(db, 'activityLogs', gameId, 'entries');
    console.log(`🔥 Collection reference created for: activityLogs/${gameId}/entries`);
    
    const docData = {
      playerId,
      playerName,
      action,
      type,
      timestamp: serverTimestamp(),
      createdAt: Date.now() // Fallback for sorting if serverTimestamp is pending
    };
    
    console.log(`🔥 Document data to save:`, docData);
    
    const docRef = await addDoc(activityRef, docData);
    console.log(`✅ Activity entry saved successfully with ID:`, docRef.id);
    
    return true;
  } catch (error) {
    console.error('❌ Error adding activity entry:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error code:', error.code);
    return false;
  }
};

// Subscribe to real-time activity log updates
export const subscribeToActivityLog = (gameId, callback) => {
  console.log(`🔥 Setting up activity log subscription for gameId:`, gameId);
  
  try {
    const activityRef = collection(db, 'activityLogs', gameId, 'entries');
    const q = query(activityRef, orderBy('createdAt', 'asc'));
    
    console.log(`🔥 Created query for: activityLogs/${gameId}/entries`);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`🔥 Received snapshot update - ${snapshot.size} documents`);
      
      const entries = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`🔥 Processing doc ${doc.id}:`, data);
        
        entries.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to readable time if available
          displayTime: data.timestamp?.toDate ? 
            data.timestamp.toDate().toLocaleTimeString() : 
            new Date(data.createdAt).toLocaleTimeString()
        });
      });
      
      console.log(`🔥 Calling callback with ${entries.length} entries:`, entries);
      callback(entries);
    }, (error) => {
      console.error('❌ Error listening to activity log:', error);
      console.error('❌ Subscription error details:', error.message);
      console.error('❌ Subscription error code:', error.code);
      callback([]);
    });
    
    console.log(`✅ Activity log subscription established`);
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to activity log:', error);
    console.error('❌ Subscription setup error:', error.message);
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