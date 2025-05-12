import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserTags } from '../../utils/db'; // Adjust path as necessary
import { verifyToken } from '../../utils/auth'; // Assuming you have an auth utility

type UserTag = {
  id: number;
  name: string;
  color: string;
  priority: number;
};

type Data = {
  tags?: UserTag[];
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Authentication: Verify token and get user ID
    // In a real app, you'd get this from a secure session or a verified JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }
    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      decodedToken = verifyToken(token); // Use your actual token verification logic
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Try to extract user ID from common JWT claims
    const userId = decodedToken?.userId || decodedToken?.user_id || decodedToken?.sub;


    if (!userId) {
      console.error('Decoded token did not contain a recognizable user ID field:', decodedToken);
      return res.status(400).json({ message: 'User ID not found in token. Ensure token payload includes userId, user_id, or sub.' });
    }

    const tags = await getUserTags(userId as string);
    res.status(200).json({ tags });
  } catch (error: any) {
    console.error('Error fetching user tags API:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
