// Helper to get server-side environment variables

export function getServerConfig() {
  return {
    // Google OAuth configuration
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail-callback',
    
    // JWT Secret for token verification
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    
    // Database connection
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:Bazinga%231702@localhost:5432/inboxiq",
  };
}
