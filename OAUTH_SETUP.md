# OAuth2 Authentication Setup Guide

## Overview
OAuth2 authentication with Google has been implemented. Users can log in with their Google account, and existing users will be preserved.

## Backend Setup Complete ✅

### Files Created:
1. **`src/config/passport.ts`** - Passport.js Google OAuth strategy
2. **`src/routes/auth.ts`** - Authentication routes (login, callback, logout)
3. **Updated `src/index.ts`** - Added auth middleware and routes

### Database Changes:
- Updated `User` model with OAuth fields:
  - `email` (String, unique)
  - `name` (String)
  - `picture` (String) - Profile picture URL
  - `googleId` (String, unique) - Google OAuth ID
  - `provider` (String) - OAuth provider name
  - `lastLogin` (DateTime) - Last login timestamp

## Frontend Setup Complete ✅

### Files Created:
1. **`frontend/src/services/authService.ts`** - Authentication service
2. **`frontend/src/pages/Login.tsx`** - Login page with Google button
3. **`frontend/src/pages/Login.css`** - Login page styles
4. **`frontend/src/pages/AuthCallback.tsx`** - OAuth callback handler
5. **Updated `frontend/src/App.tsx`** - Added auth routes

## Required Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
GOOGLE_CALLBACK_URL="http://localhost:8080/api/auth/google/callback"

# JWT Secret (generate a random string)
JWT_SECRET="your-random-secret-key-change-in-production"

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# CORS Origin
CORS_ORIGIN="http://localhost:5173"
```

## How to Get Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### Step 2: Enable Google+ API
1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

### Step 3: Create OAuth Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: Workout Tracker
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (frontend dev)
     - `http://localhost:8080` (backend dev)
     - Your production frontend URL
   - **Authorized redirect URIs**:
     - `http://localhost:8080/api/auth/google/callback` (dev)
     - `https://your-backend-url.vercel.app/api/auth/google/callback` (production)

5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Update Environment Variables
Add the credentials to your `.env` file (see above)

## Testing Locally

### 1. Start Backend
```bash
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test OAuth Flow
1. Go to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. You'll be redirected back to `/auth/callback` then to `/home`
5. Your user will be created/updated in the database

## How It Works

### Authentication Flow:
1. User clicks "Sign in with Google" on `/login`
2. Redirected to `http://localhost:8080/api/auth/google`
3. Google OAuth consent screen
4. Google redirects to `/api/auth/google/callback`
5. Backend creates/updates user in database
6. Backend generates JWT token
7. Backend redirects to frontend `/auth/callback?token=xxx`
8. Frontend stores token and user in localStorage
9. User is logged in and redirected to `/home`

### Existing User Preservation:
- If a user with the same email exists, their OAuth info is added
- If a user has a `googleId`, they can log in with Google
- All existing workout data, plans, and tasks are preserved

## API Endpoints

### Authentication Endpoints:
- **GET `/api/auth/google`** - Initiate Google OAuth
- **GET `/api/auth/google/callback`** - OAuth callback (handled by backend)
- **GET `/api/auth/me`** - Get current user (requires JWT token)
- **POST `/api/auth/logout`** - Logout (clears frontend storage)

### Protected Routes (require JWT token):
Add `Authorization: Bearer <token>` header to requests:
```typescript
headers: {
  Authorization: `Bearer ${authService.getToken()}`
}
```

## Frontend Usage

### Check if User is Logged In:
```typescript
import { authService } from './services/authService';

if (authService.isAuthenticated()) {
  const user = authService.getCurrentUser();
  console.log('Logged in as:', user.email);
}
```

### Logout:
```typescript
authService.logout();
// Redirect to login page
```

### Make Authenticated API Calls:
```typescript
import axios from 'axios';
import { authService } from './services/authService';

const response = await axios.get('/api/some-endpoint', {
  headers: authService.getAuthHeader()
});
```

## Deployment Notes

### Production Environment Variables:
Update these for production:
```bash
GOOGLE_CALLBACK_URL="https://your-backend.vercel.app/api/auth/google/callback"
FRONTEND_URL="https://your-frontend.vercel.app"
CORS_ORIGIN="https://your-frontend.vercel.app"
JWT_SECRET="<generate-a-strong-random-secret>"
```

### Update Google Cloud Console:
Add production URLs to authorized origins and redirect URIs

## Next Steps

1. **Get Google OAuth credentials** (see instructions above)
2. **Add environment variables** to `.env`
3. **Restart backend server**
4. **Test OAuth login** locally
5. **Deploy to production** with production credentials

## Security Notes

- JWT tokens expire after 30 days
- Store JWT_SECRET securely (use environment variables)
- Never commit credentials to git
- Use HTTPS in production
- Consider adding refresh tokens for better UX
- Add rate limiting to auth endpoints in production

## Troubleshooting

### "Redirect URI mismatch" error:
- Check that callback URL in Google Console matches GOOGLE_CALLBACK_URL
- Ensure URL includes protocol (http/https)

### "User not created":
- Check database connection
- Verify Prisma schema is up to date
- Check backend logs for errors

### Token not saved:
- Check browser localStorage
- Verify frontend authService is imported correctly
- Check browser console for errors

---

**Status**: ✅ OAuth2 implementation complete and ready to use!
