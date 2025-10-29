import express from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';

const router = express.Router();

// Middleware to check if user is authenticated
export const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/google/callback',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed'
    }, (err: any, user: any, info: any) => {
      console.log('📝 OAuth callback received');
      console.log('Error:', err);
      console.log('User:', user);
      console.log('Info:', info);

      if (err) {
        console.error('❌ Error in passport authentication:', err);
        return res.status(500).json({
          success: false,
          error: 'Authentication error',
          message: err.message,
          details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }

      if (!user) {
        console.error('❌ No user returned from OAuth');
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=no_user`);
      }

      try {
        console.log('✅ User authenticated, generating JWT token');
        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id.toString(),
            email: user.email,
            name: user.name
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '30d' }
        );

        console.log('✅ Token generated, redirecting to frontend');
        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`;
        res.redirect(redirectUrl);
      } catch (error: any) {
        console.error('❌ Error generating token or redirecting:', error);
        return res.status(500).json({
          success: false,
          error: 'Token generation error',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    })(req, res, next);
  }
);

// Get current user
router.get('/me', isAuthenticated, (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout
router.post('/logout', (req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
