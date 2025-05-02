import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerConfig } from '../../../utils/serverConfig';
import { saveGmailAccount } from '../../../utils/db';

// Get Google OAuth configuration
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  OAUTH_REDIRECT_URI
} = getServerConfig();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint receives the OAuth callback from Google
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ 
      message: 'Missing required parameters',
      success: false
    });
  }

  try {
    // Parse the state parameter to get the user ID
    const { userId } = JSON.parse(state as string);

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: OAUTH_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Failed to exchange code for tokens: ${errorData.error}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user information from Google to identify the email address
    const userInfoResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user email information');
    }

    const userInfo = await userInfoResponse.json();
    const emailAddress = userInfo.emailAddress;

    // Save the Gmail account information to the database
    await saveGmailAccount(userId, emailAddress, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      id_token: tokenData.id_token,
      expiry_date: Date.now() + tokenData.expires_in * 1000,
    });

    // Render a success page that will close the popup and notify the parent window
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #121212;
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .success-icon {
              width: 60px;
              height: 60px;
              background-color: #4caf50;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            h1 {
              margin-bottom: 10px;
            }
            p {
              color: #aaa;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="success-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1>Gmail Connected Successfully!</h1>
          <p>You can now close this window and continue with the onboarding process.</p>
          <script>
            // Notify the parent window that the connection was successful
            window.opener.postMessage({
              type: 'GMAIL_CONNECTED',
              email: '${emailAddress}'
            }, '*');
            
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Gmail callback error:', error);
    
    // Return an error page
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #121212;
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .error-icon {
              width: 60px;
              height: 60px;
              background-color: #f44336;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            h1 {
              margin-bottom: 10px;
            }
            p {
              color: #aaa;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <h1>Connection Failed</h1>
          <p>There was an error connecting your Gmail account. Please try again.</p>
          <script>
            // Notify the parent window that the connection failed
            window.opener.postMessage({
              type: 'GMAIL_CONNECTION_FAILED',
              error: '${error.message.replace(/'/g, "\\'")}'
            }, '*');
            
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
}
