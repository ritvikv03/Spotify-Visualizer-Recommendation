# Developer Setup Guide

## 🚀 Quick Start: Fixing 403 Errors

### Step 1: Add Users to Allowlist

Since this app is in **Development Mode**, you must manually approve each user:

1. **Go to Spotify Developer Dashboard**
   - URL: https://developer.spotify.com/dashboard
   - Log in with your Spotify developer account

2. **Select Your App**
   - Find app with Client ID: `192b8dcaf7a74066954f116e0ef4252a`
   - Click on it to open settings

3. **Navigate to "Users and Access" Tab**
   - This is where you manage the 25-user allowlist
   - You'll see currently approved users

4. **Add New Users**
   - Click "Add User" or "Add New User"
   - Enter the user's:
     - Spotify email address, OR
     - Spotify username (can be found in Spotify app under Profile)
   - Click "Save"

5. **Verify**
   - User should appear in the list
   - They can now log in immediately (no delay)

### Step 2: Tell Users to Re-authenticate

After adding a user, they should:
1. Clear their browser cache OR use incognito mode
2. Log out of your app
3. Log back in
4. The authorization screen will now show all requested scopes
5. They must click "Agree" to grant permissions

---

## 🔧 Recent Changes (2025)

### What We Fixed

1. **Added `show_dialog=true` to OAuth flow**
   - Forces users to see consent screen every time
   - Ensures all scopes are properly granted
   - Prevents cached consent issues

2. **Enhanced 403 Error Handling**
   - Detects deprecated endpoints automatically
   - Provides detailed error messages to users
   - Logs comprehensive debugging info to console

3. **Fallback Recommendation Algorithm**
   - Automatically activates when `/recommendations` endpoint returns 403
   - Uses user's saved tracks + top tracks
   - Finds "hidden gems" based on:
     - Genre matching
     - Artist frequency
     - Popularity scoring
     - Discovery score calculation

4. **User-Friendly Error Messages**
   - Clear guidance on what went wrong
   - Step-by-step instructions to fix
   - Links to documentation

---

## 📊 Architecture Overview

### Authentication Flow (PKCE)

```
1. User clicks "Login"
   ↓
2. Generate code_verifier (random string)
   ↓
3. Hash code_verifier → code_challenge (SHA-256)
   ↓
4. Redirect to Spotify with:
   - code_challenge
   - code_challenge_method: S256
   - scopes: user-top-read, user-read-recently-played, etc.
   - show_dialog: true (NEW!)
   ↓
5. User authorizes app
   ↓
6. Spotify redirects back with authorization code
   ↓
7. Exchange code for tokens (using code_verifier)
   ↓
8. Store access_token, refresh_token, expires_at
   ↓
9. Fetch user profile
   ↓
10. User is logged in!
```

### Analyze Function Flow

```
1. Fetch user data:
   - Recently played tracks (50)
   - Top tracks (30) - tries long_term, medium_term, short_term
   - Top artists (20)
   ↓
2. Deduplicate and validate
   ↓
3. Analyze taste:
   - Extract genres
   - Calculate popularity average
   - Measure diversity score
   - Identify trends
   ↓
4. Try to generate recommendations:
   A. First, try Spotify API /recommendations endpoint
      - If success: Use API results
      - If 403: Fall back to custom algorithm

   B. Custom algorithm (fallback):
      - Fetch user's saved tracks
      - Combine with top tracks
      - Filter for "hidden gems" (low popularity + genre/artist match)
      - Score and rank
   ↓
5. Display results:
   - Taste profile (popularity, diversity, genres)
   - Recommended tracks
   - Interactive visualization
```

---

## 🛠️ Key Files Modified

### 1. `src/stores/auth.js`
- Added `show_dialog: 'true'` to OAuth params (line 77)
- Forces users to see authorization screen
- Prevents cached consent issues

### 2. `src/services/spotify.js`
- Enhanced 403 error interceptor (lines 46-76)
- Detects deprecated endpoints
- Provides detailed logging
- Custom error objects with `isDeprecatedEndpoint` flag

### 3. `src/services/recommendationEngine.js`
- Added `generateFromLibrary()` method (lines 150-206)
- Modified `generateRecommendations()` to try API first, fall back second (lines 212-263)
- Graceful degradation when `/recommendations` unavailable

### 4. `src/views/Discover.vue`
- Enhanced error handling in `startAnalysis()` (lines 482-498)
- Better error messages in `loadRecommendations()` (lines 536-549)
- Detects 403 vs deprecated endpoint vs other errors

---

## 🧪 Testing Checklist

### Test 1: New User Login (Not on Allowlist)
- [ ] User sees 403 error
- [ ] Error message explains allowlist requirement
- [ ] Console shows detailed 403 debugging info

### Test 2: Approved User Login
- [ ] User can log in successfully
- [ ] Authorization screen shows all scopes
- [ ] Token stored correctly

### Test 3: Analyze Function (with /recommendations blocked)
- [ ] Analyze button works
- [ ] Console shows "Using fallback algorithm" message
- [ ] Recommendations generated from library
- [ ] No crashes or errors

### Test 4: Analyze Function (with /recommendations working)
- [ ] Uses Spotify API recommendations
- [ ] Console shows "Got recommendations from Spotify API"
- [ ] Results displayed correctly

### Test 5: Error Scenarios
- [ ] No listening history → Clear error message
- [ ] Token expired → Auto-refresh works
- [ ] 403 on top/tracks → Helpful error shown
- [ ] Network error → Graceful fallback

---

## 📈 Monitoring and Debugging

### Console Logs to Watch For

**Successful Flow:**
```
🔐 Starting login flow...
🔗 Redirecting to Spotify...
🔐 Handling callback...
✅ Token received successfully
📊 Taste analysis: {...}
🌱 Seeds selected: {...}
🎯 Recommendation params: {...}
✅ Got recommendations from Spotify API
⭐ Scored recommendations: 20
🎉 Found 20 hidden gems!
```

**Fallback Algorithm Flow:**
```
📊 Taste analysis: {...}
🌱 Seeds selected: {...}
⚠️ Spotify recommendations endpoint unavailable, using fallback algorithm
🔄 Using fallback: generating recommendations from library
📚 Found 80 tracks in library to analyze
💎 Found 35 hidden gems from library
⭐ Scored recommendations: 20
🎉 Found 20 hidden gems!
```

**403 Error Flow:**
```
⛔ 403 Forbidden Error Detected
Endpoint: /v1/recommendations
Method: GET
Response body: Empty (typical for 403 errors)
📋 Common 403 Causes:
1. User not added to Developer Dashboard allowlist (Development Mode)
2. Endpoint deprecated/unavailable for new apps
3. Insufficient OAuth scopes
4. App not in Extended Quota Mode
💡 Solution: Add users to your app allowlist at https://developer.spotify.com/dashboard
```

---

## 🚨 Common Issues

### Issue: "show_dialog=true not working"
**Solution:** Make sure the parameter value is a string `'true'`, not boolean `true`

### Issue: "Fallback algorithm returns empty results"
**Solution:** User needs more saved tracks. Ask them to "like" more songs on Spotify.

### Issue: "403 on /me/top/tracks"
**Solution:** User not on allowlist. Add them in Developer Dashboard.

### Issue: "Recommendations endpoint still failing"
**Solution:** Expected for development mode apps. Fallback algorithm should activate automatically.

---

## 📚 Resources

- **Spotify Developer Dashboard:** https://developer.spotify.com/dashboard
- **Web API Docs:** https://developer.spotify.com/documentation/web-api
- **OAuth PKCE Flow:** https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- **API Changes (Nov 2024):** https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
- **Quota Modes:** https://developer.spotify.com/documentation/web-api/concepts/quota-modes

---

## 🎯 Next Steps

### Short Term (Development Mode)
1. Add all test users to allowlist
2. Test analyze function with multiple accounts
3. Verify fallback algorithm produces good results
4. Monitor console logs for errors

### Long Term (Extended Quota Mode)
If you want to support unlimited users:
1. Apply for Extended Quota Mode (before May 15, 2025)
2. Requirements:
   - Registered business/organization
   - 250,000+ monthly active users
   - Active, launched service
   - Scalable use case
3. Submit application through Developer Dashboard
4. Wait for Spotify approval

**Note:** Extended Quota Mode may restore access to deprecated endpoints like `/recommendations`, but this is not guaranteed.

---

## 💡 Pro Tips

1. **Always check console logs** - They contain detailed error information
2. **Test in incognito mode** - Avoids cache issues
3. **Keep user list updated** - Remove inactive users to make room for new ones (25 user limit)
4. **Monitor Spotify API status** - Check https://status.spotify.com/ for outages
5. **Document changes** - Keep this guide updated as you modify the code

---

## 🤝 Contributing

When making changes:
1. Update this documentation
2. Add console logs for debugging
3. Test with both allowlisted and non-allowlisted users
4. Check browser console for errors
5. Verify fallback algorithms work
6. Update TROUBLESHOOTING.md if needed
