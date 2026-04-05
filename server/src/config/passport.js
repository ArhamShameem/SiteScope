const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

const User = require('../models/User');

const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

async function findOrCreateOAuthUser(profile, provider) {
  const email = profile.emails?.[0]?.value;

  if (!email) {
    throw new Error(`${provider} account did not return an email address`);
  }

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: profile.displayName || profile.username || email.split('@')[0],
      email,
      password: null,
      provider,
    });
  }

  return user;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${appUrl}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser(profile, 'google');
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: `${appUrl}/api/auth/github/callback`,
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser(profile, 'github');
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);
