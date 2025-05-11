import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerConfig, isGoogleOAuthConfigured } from '../../../utils/serverConfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate that Google OAuth is configured properly
    if (!isGoogleOAuthConfigured()) {
      return res.status(500).json({
        message: 'Google OAuth is not properly configured on the server',
        error: 'OAUTH_CONFIG_MISSING'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get Google OAuth configuration
    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      OAUTH_REDIRECT_URI
    } = getServerConfig();

    // Define the OAuth2 scopes needed
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.labels'
    ];

    // Create the authentication URL with explicit client_id parameter
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}` +
      `&response_type=code` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&state=${encodeURIComponent(JSON.stringify({ userId }))}`;

    // Return the authentication URL to the client
    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Gmail auth URL error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
