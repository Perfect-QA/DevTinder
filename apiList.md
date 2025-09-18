# perfect APIs

## authRouter
- POST /signup
- POST /login
- POST /logout
- POST /refresh - Refresh access token using refresh token

### Session Management
- GET /sessions - Get all active sessions
- DELETE /sessions/:sessionId - Remove specific session
- DELETE /sessions - Remove all sessions (logout everywhere)
- GET /sessions/stats - Get session statistics
- POST /sessions/activity - Update session activity
- POST /sessions/cleanup - Clean up expired sessions for current user

### Session Cleanup (Admin)
- POST /cleanup/trigger - Manually trigger session cleanup
- GET /cleanup/stats - Get cleanup service statistics
- GET /cleanup/session-stats - Get global session statistics

## profileRouter
- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/password // Forgot password API

## connectionRequestRouter
- POST /request/send/:status/:userId 
- POST /request/review/:status/:requestId

## userRouter
- GET /user/requests/received
- GET /user/connections
- GET /user/feed - Gets you the profiles of other users on platform

