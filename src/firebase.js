import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your Firebase configuration
// You'll need to replace these with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBVhmKU_uY2XzbjGfF9M6E0VoosVWDrQqw",
  authDomain: "screw-your-neighbor-game.firebaseapp.com",
  databaseURL: "https://screw-your-neighbor-game-default-rtdb.firebaseio.com",
  projectId: "screw-your-neighbor-game",
  storageBucket: "screw-your-neighbor-game.firebasestorage.app",
  messagingSenderId: "798840749535",
  appId: "1:798840749535:web:86bd3c434c3bedac1b186a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);