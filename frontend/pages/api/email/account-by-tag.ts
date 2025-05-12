import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailAccountByTagId } from '../../../utils/db';
import { verifyToken } from '../../../utils/auth';

type EmailAccount = {
  id: number;
  email_address: string;
  provider_type: string;
  last_sync: string | null;
};

type Response = {
  emailAccount?: EmailAccount;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }
    
    const token = authHeader.split(' ')[1];
    let decodedToken;
    
    try {
      decodedToken = verifyToken(token);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get tag ID from query params
    const { tagId } = req.query;
    
    if (!tagId || Array.isArray(tagId)) {
      return res.status(400).json({ message: 'Tag ID is required and must be a single value' });
    }

    // Convert tagId to number
    const tagIdNumber = parseInt(tagId, 10);
    if (isNaN(tagIdNumber)) {
      return res.status(400).json({ message: 'Tag ID must be a valid number' });
    }

    // Fetch the email account associated with the tag
    const emailAccount = await getEmailAccountByTagId(tagIdNumber);
    
    if (!emailAccount) {
      return res.status(404).json({ message: 'No email account found for this tag' });
    }

    return res.status(200).json({ emailAccount });
  } catch (error: any) {
    console.error('Error fetching email account by tag ID:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
