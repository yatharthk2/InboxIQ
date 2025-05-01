import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByEmail } from '../../../utils/db';
import { verifyPassword, generateToken } from '../../../utils/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get user from database
    const user = await getUserByEmail(email);
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.hashed_password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.user_id, user.email);

    // Return success with token
    return res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: user.user_id,
        email: user.email
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
