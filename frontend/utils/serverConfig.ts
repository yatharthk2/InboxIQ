// Helper to get server-side environment variables

interface ServerConfig {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OAUTH_REDIRECT_URI: string;
  // Add other server config values as needed
}

export function getServerConfig(): ServerConfig {
  // Get configuration from environment variables
  const config = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail-callback',
    
    // JWT Secret for token verification
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    
    // Database connection
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:Bazinga%231702@localhost:5432/inboxiq",
  };

  // Validate Google OAuth configuration
  if (!config.GOOGLE_CLIENT_ID) {
    console.error('Missing GOOGLE_CLIENT_ID in environment variables');
  }
  
  if (!config.GOOGLE_CLIENT_SECRET) {
    console.error('Missing GOOGLE_CLIENT_SECRET in environment variables');
  }
  
  if (!config.OAUTH_REDIRECT_URI) {
    console.error('Missing OAUTH_REDIRECT_URI in environment variables');
  }

  return config;
}

// Helper to validate if Google OAuth is configured properly
export function isGoogleOAuthConfigured(): boolean {
  const config = getServerConfig();
  return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET && config.OAUTH_REDIRECT_URI);
}
