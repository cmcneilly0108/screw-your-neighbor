# Firestore Security Rules Setup

To fix the activity log synchronization, you need to update the Firestore security rules in your Firebase console.

## Steps to Update Firestore Rules:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `screw-your-neighbor-game`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to activity logs for all users
    // This enables cross-player activity log synchronization
    match /activityLogs/{gameId}/entries/{document=**} {
      allow read, write: if true;
    }
    
    // Keep other collections restricted (add rules as needed)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5. Click **Publish** to save the rules

## What this fixes:
- Allows all players to read activity log entries from other players
- Allows all players to write new activity log entries
- Enables real-time synchronization of the activity log across all players

## Testing:
After updating the rules, test by:
1. Opening the game in two different browsers/tabs
2. Creating a game in one browser
3. Joining the game in the second browser
4. Taking actions in both browsers and verifying both players see all activities

## Security Note:
These rules allow open access to activity logs for simplicity. In production, you might want to restrict access to only players in the same game by checking the gameId or implementing authentication.