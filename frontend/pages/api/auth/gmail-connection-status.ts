import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { getUserGmailAccounts } from '../../../utils/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify the user's token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const tokenData = verifyToken(token);
  if (!tokenData) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    // Get the user's connected Gmail accounts
    const accounts = await getUserGmailAccounts(tokenData.sub);
    
    // Check if any new accounts were connected recently
    const latestAccount = accounts.length > 0 ? accounts[accounts.length - 1] : null;
    
    // Return the connection status and accounts
    return res.status(200).json({
      connected: accounts.length > 0,
      account: latestAccount,
      accounts
    });
  } catch (error) {
    console.error('Gmail connection status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
