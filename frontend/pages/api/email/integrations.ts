import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserGmailAccounts } from '@/utils/db';
import { verifyToken } from '../../../utils/auth';

type EmailIntegrationData = {
  id: number;
  email_address: string;
  provider_type: string;
  last_sync: string | null;
};

type ResponseData = {
  integrations?: EmailIntegrationData[];
  message?: string;
  error?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  console.log(`[API /api/email/integrations] Received request: ${req.method}`);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    console.log(`[API /api/email/integrations] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Verify the user's token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[API /api/email/integrations] Error: Unauthorized - No valid token provided.');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const tokenData = verifyToken(token);
  if (!tokenData) {
    console.log('[API /api/email/integrations] Error: Invalid or expired token.');
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // Use userId from token or from query parameter
  const userId = req.query.userId || tokenData.sub;
  console.log(`[API /api/email/integrations] Using userId: ${userId}`);

  if (!userId || typeof userId !== 'string') {
    console.log('[API /api/email/integrations] Error: User ID is missing or invalid.');
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    console.log(`[API /api/email/integrations] Calling getUserGmailAccounts for userId: ${userId}`);
    const integrations = await getUserGmailAccounts(userId);
    console.log(`[API /api/email/integrations] Successfully fetched ${integrations.length} integrations for userId: ${userId}`);
    return res.status(200).json({ integrations });
  } catch (error: any) {
    console.error('[API /api/email/integrations] Error fetching email integrations:', error);
    console.error('[API /api/email/integrations] Error message:', error.message);
    console.error('[API /api/email/integrations] Error stack:', error.stack);

    let statusCode = 500;
    let message = 'Internal Server Error';

    if (error.message === 'User not found') {
      statusCode = 404;
      message = 'User not found';
    }

    console.log(`[API /api/email/integrations] Responding with status ${statusCode}: ${message}`);
    return res.status(statusCode).json({ message, error: { message: error.message, stack: error.stack } });
  }
}
