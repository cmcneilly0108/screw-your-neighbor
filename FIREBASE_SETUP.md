# Firebase Setup Instructions

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Name it "screw-your-neighbor-game" (or similar)
4. Disable Google Analytics (not needed for this project)
5. Click "Create project"

## Step 2: Set up Realtime Database

1. In your Firebase project, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select a location (choose closest to your users)

## Step 3: Get Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web (</>) icon
4. Register app with nickname "screw-your-neighbor-web"
5. Copy the config object

## Step 4: Update Firebase Config

Replace the config in `src/firebase.js` with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 5: Test the Setup

After updating the config, the app should work with real-time multiplayer across different devices!

## Security Rules (Optional)

Later, you can update your Realtime Database rules:

```json
{
  "rules": {
    "games": {
      "$gameId": {
        ".read": true,
        ".write": true,
        ".indexOn": ["gameId"]
      }
    }
  }
}
```