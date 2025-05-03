import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { deleteEmailAccount } from '../../../utils/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept DELETE requests
  if (req.method !== 'DELETE') {
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
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string, 10) : null;
    
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    await deleteEmailAccount(tokenData.sub, accountId);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email account disconnected successfully' 
    });
  } catch (error) {
    console.error('Email account delete error:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
