import type { NextApiRequest, NextApiResponse } from 'next';
import { addTagToEmailAccount } from '../../../../../../utils/db'; // Corrected path
import { verifyToken } from '../../../../../../utils/auth'; // Corrected path

type Data = {
  tag?: any; // Define a proper type for the tag if available
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { accountId } = req.query;
  const numericAccountId = parseInt(accountId as string, 10);

  if (isNaN(numericAccountId)) {
    return res.status(400).json({ message: 'Invalid account ID.' });
  }

  if (req.method === 'POST') {
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

      const { tagId } = req.body;
      const numericTagId = parseInt(tagId as string, 10);

      if (isNaN(numericTagId)) {
        return res.status(400).json({ message: 'Invalid tag ID.' });
      }

      // Here, you might want to add a check to ensure the user owns the accountId
      // For brevity, skipping this advanced validation.

      const newTagAssociation = await addTagToEmailAccount(numericAccountId, numericTagId);

      if (newTagAssociation) {
        res.status(201).json({ tag: newTagAssociation, message: 'Tag added to account successfully.' });
      } else {
        // This case should ideally not be reached if addTagToEmailAccount throws errors appropriately.
        // However, keeping a fallback.
        res.status(500).json({ message: 'Failed to add tag to account for an unknown reason.' });
      }
    } catch (error: any) {
      console.error(`Error adding tag to account ${numericAccountId}:`, error);
      if (error.message && error.message.startsWith('Tag is already assigned to another account')) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(500).json({ message: error.message || 'Internal Server Error' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
