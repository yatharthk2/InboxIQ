import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '../../../utils/auth';
import { saveLlmApiKey } from '../../../utils/db';

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
    const { providerId, apiKey, defaultModel, providerName } = req.body;
    
    if (!providerId || !apiKey) {
      return res.status(400).json({ message: 'Provider ID and API key are required' });
    }
    
    // Check if this provider exists, if not create it
    const provider = await saveLlmApiKey(
      tokenData.sub, 
      providerId, 
      apiKey, 
      defaultModel || null,
      providerName || null
    );
    
    return res.status(200).json({ 
      message: 'API key saved successfully',
      provider 
    });
  } catch (error) {
    console.error('Error saving LLM API key:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
