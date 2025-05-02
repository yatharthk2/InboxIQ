import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { assignTagsToEmails } from '../../../utils/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
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
    const { assignments } = req.body;
    
    if (!assignments || typeof assignments !== 'object') {
      return res.status(400).json({ message: 'Invalid assignment data' });
    }
    
    // Save the tag assignments
    await assignTagsToEmails(tokenData.sub, assignments);
    
    return res.status(200).json({ message: 'Tags assigned successfully' });
  } catch (error) {
    console.error('Error assigning tags to emails:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
