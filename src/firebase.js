import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your Firebase configuration
// You'll need to replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDummy-Key-Replace-With-Your-Real-Key",
  authDomain: "screw-your-neighbor-game.firebaseapp.com",
  databaseURL: "https://screw-your-neighbor-game-default-rtdb.firebaseio.com/",
  projectId: "screw-your-neighbor-game",
  storageBucket: "screw-your-neighbor-game.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:dummy-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);