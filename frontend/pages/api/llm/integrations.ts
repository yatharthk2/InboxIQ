import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserLlmIntegrations } from '@/utils/db'; // Adjust path as needed
import { verifyToken } from '../../../utils/auth';

type LlmIntegrationData = {
  key_id: number;
  provider_id: number;
  is_active: boolean;
  default_model: string | null;
  last_used: string | null;
  provider_name: string;
  provider_display_name: string;
  provider_logo_url: string | null;
};

type ResponseData = {
  integrations?: LlmIntegrationData[];
  message?: string;
  error?: any; // Add error field for debugging
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  console.log(`[API /api/llm/integrations] Received request: ${req.method}`); // Log request method

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    console.log(`[API /api/llm/integrations] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Verify the user's token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[API /api/llm/integrations] Error: Unauthorized - No valid token provided.');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const tokenData = verifyToken(token);
  if (!tokenData) {
    console.log('[API /api/llm/integrations] Error: Invalid or expired token.');
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Use userId from token or from query parameter
  const userId = req.query.userId || tokenData.sub;
  console.log(`[API /api/llm/integrations] Using userId: ${userId}`);

  if (!userId || typeof userId !== 'string') {
    console.log('[API /api/llm/integrations] Error: User ID is missing or invalid.');
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    console.log(`[API /api/llm/integrations] Calling getUserLlmIntegrations for userId: ${userId}`);
    const integrations = await getUserLlmIntegrations(userId);
    console.log(`[API /api/llm/integrations] Successfully fetched ${integrations.length} integrations for userId: ${userId}`);
    return res.status(200).json({ integrations });
  } catch (error: any) {
    // Log the detailed error object
    console.error('[API /api/llm/integrations] Error fetching LLM integrations:', error);
    // Log specific properties if available
    console.error('[API /api/llm/integrations] Error message:', error.message);
    console.error('[API /api/llm/integrations] Error stack:', error.stack);

    let statusCode = 500;
    let message = 'Internal Server Error';

    if (error.message === 'User not found') {
      statusCode = 404;
      message = 'User not found';
    }
    // Add more specific error checks based on potential DB errors if needed

    console.log(`[API /api/llm/integrations] Responding with status ${statusCode}: ${message}`);
    // Include error details in the response for easier debugging (remove in production)
    return res.status(statusCode).json({ message, error: { message: error.message, stack: error.stack } });
  }
}
