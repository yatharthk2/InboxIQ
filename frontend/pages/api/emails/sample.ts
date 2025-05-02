import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { getUserGmailAccounts, fetchSampleEmails } from '../../../utils/db';

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
    // Get the user's Gmail accounts
    const accounts = await getUserGmailAccounts(tokenData.sub);
    
    if (accounts.length === 0) {
      return res.status(200).json({ emails: [] });
    }
    
    // Fetch sample emails from the first connected account
    const sampleEmails = await fetchSampleEmails(accounts[0].id);
    
    // Return the emails
    return res.status(200).json({ emails: sampleEmails });
  } catch (error) {
    console.error('Error fetching sample emails:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
