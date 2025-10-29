import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Check if user already exists by googleId or email
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId },
              { email }
            ]
          }
        });

        if (user) {
          // Update existing user with OAuth info
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              provider: 'google',
              email,
              name: name || user.name,
              picture: picture || user.picture,
              lastLogin: new Date()
            }
          });
          console.log(`✅ Existing user logged in: ${email}`);
        } else {
          // Create new user
          user = await prisma.user.create({
            data: {
              googleId,
              provider: 'google',
              email,
              name,
              picture,
              lastLogin: new Date()
            }
          });
          console.log(`✅ New user created: ${email}`);
        }

        return done(null, user);
      } catch (error) {
        console.error('❌ Error in Google OAuth strategy:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user to store in session
passport.serializeUser((user: any, done) => {
  done(null, user.id.toString());
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
