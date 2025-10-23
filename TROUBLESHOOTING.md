# Troubleshooting Guide

## 🔒 403 Forbidden Error - "Access Denied"

If you see a **403 error** when trying to use the Analyze function, this means your Spotify account is not approved to use this app.

### Why This Happens

This app is currently in **Development Mode**, which means only users manually added to an "allowlist" can use it. Spotify limits development mode apps to 25 approved users for security reasons.

### Solution: Add Your Account to the Allowlist

#### For App Developers:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Select your application (the one with Client ID: `192b8dcaf7a74066954f116e0ef4252a`)
4. Navigate to the **"Users and Access"** tab
5. Click **"Add User"**
6. Enter the Spotify account email or username you want to approve
7. Click **"Save"**
8. The user can now log in and use the app!

#### For Users:

Ask the app developer to add your Spotify account to the allowlist. Provide them with:
- Your Spotify email address, OR
- Your Spotify username

Once added, you'll need to:
1. Log out of the app
2. Clear your browser cache (or use incognito mode)
3. Log in again

The app should now work!

---

## 🎵 "Spotify Recommendations endpoint is no longer available"

### What Happened?

On **November 27, 2024**, Spotify deprecated several API endpoints including:
- `/recommendations` - Get track recommendations
- `/audio-features` - Get audio features (energy, danceability, etc.)
- `/audio-analysis` - Get detailed audio analysis

These endpoints are **no longer available** for apps in Development Mode.

### Our Solution

This app now uses a **custom recommendation algorithm** that:
- Analyzes your listening history (top tracks, artists, genres)
- Finds "hidden gems" from your own library
- Scores tracks based on popularity, genre match, and artist diversity
- Recommends tracks you already have but might have forgotten about!

**This fallback algorithm activates automatically** if the Spotify recommendations endpoint returns a 403 error.

---

## 🚫 Common Errors and Solutions

### Error: "No music data found! Play 5-10 songs on Spotify first."

**Cause:** Your Spotify account doesn't have enough listening history.

**Solution:**
1. Open Spotify and play at least 5-10 different songs
2. Wait a few minutes for Spotify to process your listening history
3. Try the Analyze function again

---

### Error: "Token expired" or "401 Unauthorized"

**Cause:** Your access token has expired.

**Solution:** The app should automatically refresh your token. If it doesn't:
1. Log out
2. Log back in
3. Try again

---

### Error: "User not registered in the developer dashboard"

**Cause:** You're trying to use an account that hasn't been added to the allowlist.

**Solution:** See the "Add Your Account to the Allowlist" section above.

---

## 🔧 Developer Notes

### API Endpoints Status (as of 2025)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/me/top/tracks` | ✅ Available | Works in Development Mode |
| `/me/top/artists` | ✅ Available | Works in Development Mode |
| `/me/player/recently-played` | ✅ Available | Works in Development Mode |
| `/me/tracks` | ✅ Available | User's saved tracks |
| `/recommendations` | ❌ Deprecated | Only for Extended Quota apps |
| `/audio-features` | ❌ Deprecated | Only for Extended Quota apps |
| `/audio-analysis` | ❌ Deprecated | Only for Extended Quota apps |

### OAuth Scopes Required

Make sure your app requests these scopes:
- `user-read-private` - Read user profile
- `user-read-email` - Read user email
- `user-top-read` - **Required for Analyze function**
- `user-read-recently-played` - **Required for Analyze function**
- `user-library-read` - Read saved tracks
- Additional scopes for playback and playlist management

### Development Mode Limitations

- Maximum 25 approved users
- Deprecated endpoints (recommendations, audio-features) unavailable
- To support unlimited users, apply for **Extended Quota Mode**
  - Requires: Registered business, 250K+ MAU, launched service
  - Deadline: May 15, 2025 for existing grandfathered access

---

## 📚 Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [API Changes Announcement (Nov 27, 2024)](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)
- [OAuth 2.0 PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)

---

## 🆘 Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Verify your Spotify account** has listening history
3. **Ensure you're on the allowlist** (Development Mode only)
4. **Try incognito mode** to rule out cache issues
5. **Check Spotify API status** at [Spotify Status](https://status.spotify.com/)

If none of these solutions work, file an issue with:
- Error message from console
- Steps to reproduce
- Your Spotify account type (Free/Premium)
- Browser and version
