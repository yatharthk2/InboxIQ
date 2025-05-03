import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { deleteLlmApiKey } from '../../../utils/db';

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
    const { keyId } = req.query;
    
    if (!keyId) {
      return res.status(400).json({ message: 'Key ID is required' });
    }
    
    // Delete the API key
    await deleteLlmApiKey(tokenData.sub, Number(keyId));
    
    return res.status(200).json({ 
      message: 'API key deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting LLM API key:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
