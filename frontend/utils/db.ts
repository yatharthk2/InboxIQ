import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Create a connection pool to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Bazinga%231702@localhost:5432/inboxiq",
});

// Helper function to execute SQL queries
export async function query(text: string, params: any[] = []) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Helper function specifically for user authentication
export async function getUserByEmail(email: string) {
  const result = await query(
    'SELECT id, user_id, email, hashed_password FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

// Helper to create a new user
export async function createUser(email: string, hashedPassword: string) {
  const uuid = uuidv4();
  const result = await query(
    'INSERT INTO users (email, hashed_password, user_id) VALUES ($1, $2, $3) RETURNING id, user_id, email',
    [email, hashedPassword, uuid]
  );
  return result.rows[0];
}
