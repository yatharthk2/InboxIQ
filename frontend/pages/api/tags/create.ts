import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { createTags } from '../../../utils/db';

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
    const { tags } = req.body;
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ message: 'At least one tag is required' });
    }
    
    // Save the tags to the database
    const savedTags = await createTags(tokenData.sub, tags);
    
    return res.status(200).json({ 
      message: 'Tags created successfully',
      tags: savedTags
    });
  } catch (error) {
    console.error('Error creating tags:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
