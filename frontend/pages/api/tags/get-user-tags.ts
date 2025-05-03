import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { getUserTags } from '../../../utils/db';

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
    // Get the tags for the user
    const tags = await getUserTags(tokenData.sub);
    
    return res.status(200).json({ tags });
  } catch (error) {
    console.error('Error getting user tags:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
