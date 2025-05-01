import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByEmail, createUser } from '../../../utils/db';
import { hashPassword, generateToken } from '../../../utils/auth';

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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Password strength validation (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await createUser(email, hashedPassword);

    // Generate token
    const token = generateToken(newUser.user_id, newUser.email);

    // Return success with token
    return res.status(201).json({ 
      message: 'Registration successful',
      user: {
        id: newUser.user_id,
        email: newUser.email
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
