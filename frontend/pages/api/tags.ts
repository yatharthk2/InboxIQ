import type { NextApiRequest, NextApiResponse } from 'next';
import { createTags } from '../../utils/db'; // Adjust path as necessary
import { verifyToken } from '../../utils/auth'; // Assuming you have an auth utility

type UserTag = {
  id: number;
  name: string;
  color: string;
  priority: number;
};

type Data = {
  tag?: UserTag;
  tags?: UserTag[]; // createTags returns an array
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

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

    // Try to extract user ID from common JWT claims
    const userId = decodedToken?.userId || decodedToken?.user_id || decodedToken?.sub;

    if (!userId) {
      console.error('Decoded token did not contain a recognizable user ID field:', decodedToken);
      return res.status(401).json({ message: 'User ID not found in token. Ensure token payload includes userId, user_id, or sub.' });
    }

    const { name, color, priority = 0 } = req.body; // Default priority to 0 if not provided

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Tag name is required and must be a non-empty string.' });
    }
    if (!color || typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      // Basic hex color validation
      return res.status(400).json({ message: 'Tag color is required and must be a valid hex color string (e.g., #RRGGBB).' });
    }
    if (typeof priority !== 'number') {
        return res.status(400).json({ message: 'Priority must be a number.' });
    }


    const newTagData = { name: name.trim(), color, priority };
    
    // createTags expects an array and returns an array
    const savedTags = await createTags(userId, [newTagData]);

    if (savedTags && savedTags.length > 0) {
      res.status(201).json({ tag: savedTags[0], message: 'Tag created successfully.' });
    } else {
      // This case might happen if the tag already exists and createTags is designed to not re-create or error out
      // but rather return the existing one (or update it). Adjust based on createTags behavior.
      // For now, assuming it should always return the created/updated tag.
      // If createTags returns empty on "already exists and no change", we might need to fetch it.
      // However, the current createTags updates if color/priority changes, or returns existing.
      // If it didn't create a *new* one but found an existing one, it's still a success in a way.
      // Let's assume createTags returns the tag (new or existing updated).
      // If it could return null/empty for some reason when it should have succeeded, this needs adjustment.
      // The current db.createTags pushes to savedTags, so it should contain the tag.
      return res.status(500).json({ message: 'Failed to create or retrieve tag.' });
    }

  } catch (error: any) {
    console.error('Error creating tag API:', error);
    // Check for unique constraint violation (e.g., user_id, name)
    if (error.message && error.message.includes('duplicate key value violates unique constraint "email_tags_user_id_name_key"')) {
        return res.status(409).json({ message: `Tag with name "${req.body.name}" already exists for this user.` });
    }
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
