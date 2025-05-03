import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/utils/db';
import { verifyToken } from '../../../utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API /api/email/disconnect] Received request: ${req.method}`);

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    console.log(`[API /api/email/disconnect] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Verify the user's token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[API /api/email/disconnect] Error: Unauthorized - No valid token provided.');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const tokenData = verifyToken(token);
  if (!tokenData) {
    console.log('[API /api/email/disconnect] Error: Invalid or expired token.');
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const userId = tokenData.sub;
  const { accountId } = req.query;

  if (!accountId) {
    console.log('[API /api/email/disconnect] Error: Account ID is missing.');
    return res.status(400).json({ message: 'Account ID is required' });
  }

  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log('[API /api/email/disconnect] Error: User not found.');
      return res.status(404).json({ message: 'User not found' });
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Delete the email account, ensuring it belongs to the user
    const result = await query(
      'DELETE FROM email_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [accountId, numericUserId]
    );
    
    if (result.rows.length === 0) {
      console.log('[API /api/email/disconnect] Error: Account not found or does not belong to the user.');
      return res.status(404).json({ message: 'Account not found or does not belong to the user' });
    }
    
    console.log(`[API /api/email/disconnect] Successfully disconnected account ID: ${accountId}`);
    return res.status(200).json({ message: 'Account disconnected successfully' });
  } catch (error: any) {
    console.error('[API /api/email/disconnect] Error disconnecting account:', error);
    return res.status(500).json({ 
      message: 'Error disconnecting account', 
      error: { message: error.message } 
    });
  }
}
