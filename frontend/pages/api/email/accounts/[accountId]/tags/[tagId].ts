import type { NextApiRequest, NextApiResponse } from 'next';
import { removeTagFromEmailAccount } from '../../../../../../utils/db'; // Corrected path
import { verifyToken } from '../../../../../../utils/auth'; // Corrected path

type Data = {
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { accountId, tagId } = req.query;
  const numericAccountId = parseInt(accountId as string, 10);
  const numericTagId = parseInt(tagId as string, 10);

  if (isNaN(numericAccountId) || isNaN(numericTagId)) {
    return res.status(400).json({ message: 'Invalid account ID or tag ID.' });
  }

  if (req.method === 'DELETE') {
    try {
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

      const userId = decodedToken?.userId || decodedToken?.user_id || decodedToken?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found in token.' });
      }
      
      // Add ownership validation if necessary: ensure user owns accountId

      const success = await removeTagFromEmailAccount(numericAccountId, numericTagId);

      if (success) {
        res.status(200).json({ message: 'Tag removed from account successfully.' });
      } else {
        res.status(404).json({ message: 'Tag association not found or failed to remove.' });
      }
    } catch (error: any) {
      console.error(`Error removing tag ${numericTagId} from account ${numericAccountId}:`, error);
      res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
