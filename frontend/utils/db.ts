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

// Helper to save a Gmail account
export async function saveGmailAccount(userId: string, emailAddress: string, oauthTokens: any) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Check if this email account already exists for the user
    const existingAccount = await query(
      'SELECT id FROM email_accounts WHERE user_id = $1 AND email_address = $2',
      [numericUserId, emailAddress]
    );
    
    // Convert the OAuth tokens to a JSON string
    const tokensJson = JSON.stringify(oauthTokens);
    
    if (existingAccount.rows.length > 0) {
      // Update the existing account
      await query(
        'UPDATE email_accounts SET oauth_tokens = $1, last_sync = NOW() WHERE id = $2',
        [tokensJson, existingAccount.rows[0].id]
      );
      
      // Return the updated account
      const result = await query(
        'SELECT id, email_address, provider_type, last_sync FROM email_accounts WHERE id = $1',
        [existingAccount.rows[0].id]
      );
      
      return result.rows[0];
    } else {
      // Insert a new account
      const result = await query(
        'INSERT INTO email_accounts (user_id, email_address, provider_type, oauth_tokens, last_sync) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email_address, provider_type, last_sync',
        [numericUserId, emailAddress, 'gmail', tokensJson]
      );
      
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error saving Gmail account:', error);
    throw error;
  }
}

// Helper to get user's Gmail accounts
export async function getUserGmailAccounts(userId: string) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Get all Gmail accounts for the user and their associated tag
    const result = await query(
      `SELECT 
         ea.id, 
         ea.email_address, 
         ea.provider_type, 
         ea.last_sync,
         COALESCE(
           (SELECT json_build_object('id', et.id, 'name', et.name, 'color', et.color, 'priority', et.priority)
            FROM email_tags et
            JOIN EmailAccountTags eat ON et.id = eat.email_tag_id
            WHERE eat.email_account_id = ea.id
            LIMIT 1), -- Ensure only one tag is fetched
           NULL -- Use NULL if no tag is associated
         ) as tag -- Changed from 'tags' to 'tag' and expecting a single object or null
       FROM email_accounts ea
       WHERE ea.user_id = $1 
       ORDER BY ea.id`,
      [numericUserId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting Gmail accounts:', error);
    throw error;
  }
}

// Helper to fetch sample emails for a user's account
export async function fetchSampleEmails(accountId: number) {
  try {
    // In a real implementation, this would fetch actual emails
    // For demo purposes, we'll return some sample emails
    return [
      {
        id: 'email1',
        sender: 'notifications@github.com',
        subject: 'New pull request in your repository',
        snippet: 'A new pull request has been opened in your repository. Please review and provide feedback.',
        date: new Date().toISOString()
      },
      {
        id: 'email2',
        sender: 'team@slack.com',
        subject: 'Weekly activity in your workspace',
        snippet: 'Here\'s a summary of activity in your Slack workspace for the past week.',
        date: new Date(Date.now() - 86400000).toISOString() // Yesterday
      },
      {
        id: 'email3',
        sender: 'newsletter@medium.com',
        subject: 'Top stories for you',
        snippet: 'Check out these featured stories based on your reading history and interests.',
        date: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: 'email4',
        sender: 'billing@aws.amazon.com',
        subject: 'Your AWS invoice for May 2023',
        snippet: 'Your monthly AWS invoice is available. Total amount: $156.72',
        date: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      },
      {
        id: 'email5',
        sender: 'hr@company.com',
        subject: 'Important updates to company policies',
        snippet: 'Please review the attached updated company policies that will go into effect next month.',
        date: new Date(Date.now() - 345600000).toISOString() // 4 days ago
      }
    ];
  } catch (error) {
    console.error('Error fetching sample emails:', error);
    throw error;
  }
}

// Helper to create tags for a user
export async function createTags(userId: string, tags: any[]) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Create tags for the user
    const savedTags = [];
    
    for (const tag of tags) {
      // Set a default priority if none is provided
      const priority = tag.priority !== undefined ? tag.priority : 0;
      
      // Check if the tag already exists for this user
      const existingTag = await query(
        'SELECT id, name, color, priority FROM email_tags WHERE user_id = $1 AND name = $2',
        [numericUserId, tag.name]
      );
      
      if (existingTag.rows.length > 0) {
        // Tag already exists, update it if needed
        if (existingTag.rows[0].color !== tag.color || existingTag.rows[0].priority !== priority) {
          await query(
            'UPDATE email_tags SET color = $1, priority = $2 WHERE id = $3',
            [tag.color, priority, existingTag.rows[0].id]
          );
        }
        
        savedTags.push({
          id: existingTag.rows[0].id,
          name: existingTag.rows[0].name,
          color: tag.color,
          priority: priority
        });
      } else {
        // Create a new tag with priority
        const newTag = await query(
          'INSERT INTO email_tags (user_id, name, color, priority) VALUES ($1, $2, $3, $4) RETURNING id, name, color, priority',
          [numericUserId, tag.name, tag.color, priority]
        );
        
        savedTags.push(newTag.rows[0]);
      }
    }
    
    return savedTags;
  } catch (error) {
    console.error('Error creating tags:', error);
    throw error;
  }
}

// Helper to assign tags to emails
export async function assignTagsToEmails(userId: string, emailTagAssignments: Record<string, number[]>) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Create a table to store email-tag assignments if it doesn't exist
    // This would normally be part of your database schema, but for demonstration:
    await query(`
      CREATE TABLE IF NOT EXISTS email_tag_assignments (
        id SERIAL PRIMARY KEY,
        email_id VARCHAR(255) NOT NULL,
        tag_id INTEGER NOT NULL REFERENCES email_tags(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(email_id, tag_id, user_id)
      )
    `);
    
    // Process each email-tag assignment
    for (const [emailId, tagIds] of Object.entries(emailTagAssignments)) {
      for (const tagId of tagIds) {
        // Check if the assignment already exists
        const existingAssignment = await query(
          'SELECT id FROM email_tag_assignments WHERE email_id = $1 AND tag_id = $2 AND user_id = $3',
          [emailId, tagId, numericUserId]
        );
        
        if (existingAssignment.rows.length === 0) {
          // Create a new assignment
          await query(
            'INSERT INTO email_tag_assignments (email_id, tag_id, user_id) VALUES ($1, $2, $3)',
            [emailId, tagId, numericUserId]
          );
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error assigning tags to emails:', error);
    throw error;
  }
}

// Helper to save LLM API key
export async function saveLlmApiKey(
  userId: string, 
  providerId: string, 
  apiKey: string, 
  defaultModel?: string | null,
  providerName?: string | null
) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Check if the provider exists, if not create it
    let providerResult = await query(
      'SELECT id FROM llmproviders WHERE name = $1',
      [providerId]
    );
    
    let numericProviderId;
    
    if (providerResult.rows.length === 0 && providerName) {
      // Create the provider
      providerResult = await query(
        `INSERT INTO llmproviders (
          name, display_name, description, active
        ) VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          providerId, 
          providerName,
          `API provider for ${providerName}`,
          true
        ]
      );
      
      numericProviderId = providerResult.rows[0].id;
    } else if (providerResult.rows.length === 0) {
      throw new Error('Provider not found and no name provided to create it');
    } else {
      numericProviderId = providerResult.rows[0].id;
    }
    
    // Check if this user already has a key for this provider
    const existingKeyResult = await query(
      'SELECT id FROM userllmkeys WHERE user_id = $1 AND provider_id = $2',
      [numericUserId, numericProviderId]
    );
    
    if (existingKeyResult.rows.length > 0) {
      // Update the existing key
      await query(
        `UPDATE userllmkeys SET 
          api_key = $1, 
          default_model = $2, 
          is_active = true, 
          last_used = NOW() 
        WHERE id = $3`,
        [apiKey, defaultModel || null, existingKeyResult.rows[0].id]
      );
      
      return {
        id: numericProviderId,
        name: providerId,
        display_name: providerName || providerId
      };
    } else {
      // Insert a new key
      await query(
        `INSERT INTO userllmkeys (
          user_id, provider_id, api_key, default_model, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [numericUserId, numericProviderId, apiKey, defaultModel || null, true]
      );
      
      return {
        id: numericProviderId,
        name: providerId,
        display_name: providerName || providerId
      };
    }
  } catch (error) {
    console.error('Error saving LLM API key:', error);
    throw error;
  }
}

// Helper to delete LLM API key
export async function deleteLlmApiKey(userId: string, keyId: number) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Verify the key belongs to the user before deleting
    const keyResult = await query(
      'SELECT id FROM userllmkeys WHERE id = $1 AND user_id = $2',
      [keyId, numericUserId]
    );
    
    if (keyResult.rows.length === 0) {
      throw new Error('API key not found or does not belong to the user');
    }
    
    // Delete the key
    await query(
      'DELETE FROM userllmkeys WHERE id = $1',
      [keyId]
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting LLM API key:', error);
    throw error;
  }
}

// Helper to get tags for a user
export async function getUserTags(userId: string) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Get the tags for the user
    const tagsResult = await query(
      'SELECT id, name, color, priority FROM email_tags WHERE user_id = $1 ORDER BY priority DESC, name',
      [numericUserId]
    );
    
    return tagsResult.rows;
  } catch (error) {
    console.error('Error getting user tags:', error);
    throw error;
  }
}

// Helper to get user's LLM integrations
export async function getUserLlmIntegrations(userId: string) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const numericUserId = userResult.rows[0].id;

    // Get all LLM keys and provider details for the user
    const result = await query(
      `SELECT
         ulk.id AS key_id,
         ulk.provider_id,
         ulk.is_active,
         ulk.default_model,
         ulk.last_used,
         lp.name AS provider_name,
         lp.display_name AS provider_display_name,
         lp.logo_url AS provider_logo_url
       FROM userllmkeys ulk
       JOIN llmproviders lp ON ulk.provider_id = lp.id
       WHERE ulk.user_id = $1
       ORDER BY lp.display_name`,
      [numericUserId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting LLM integrations:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Helper to delete an email account
export async function deleteEmailAccount(userId: string, accountId: number) {
  try {
    // First, get the numeric user ID from the UUID
    const userResult = await query(
      'SELECT id FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const numericUserId = userResult.rows[0].id;
    
    // Verify the account belongs to the user before deleting
    const accountResult = await query(
      'SELECT id FROM email_accounts WHERE id = $1 AND user_id = $2',
      [accountId, numericUserId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new Error('Email account not found or does not belong to the user');
    }
    
    // Delete the account
    await query(
      'DELETE FROM email_accounts WHERE id = $1',
      [accountId]
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting email account:', error);
    throw error;
  }
}

// Helper to get tags associated with an email account
export async function getEmailAccountAssociatedTags(emailAccountId: number) {
  try {
    const result = await query(
      `SELECT et.id, et.name, et.color, et.priority
       FROM email_tags et
       JOIN EmailAccountTags eat ON et.id = eat.email_tag_id
       WHERE eat.email_account_id = $1
       ORDER BY et.priority DESC, et.name`,
      [emailAccountId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting email account associated tags:', error);
    throw error;
  }
}

// Helper to add a tag to an email account
export async function addTagToEmailAccount(emailAccountId: number, tagId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if the tagId is already used by another account
    const existingTagUsage = await client.query(
      'SELECT email_account_id FROM EmailAccountTags WHERE email_tag_id = $1 AND email_account_id != $2',
      [tagId, emailAccountId]
    );

    if (existingTagUsage.rows.length > 0) {
      throw new Error(`Tag is already assigned to another account (ID: ${existingTagUsage.rows[0].email_account_id}).`);
    }

    // Remove any existing tag from the current email account
    await client.query(
      'DELETE FROM EmailAccountTags WHERE email_account_id = $1',
      [emailAccountId]
    );

    // Add the new tag association
    const insertResult = await client.query(
      `INSERT INTO EmailAccountTags (email_account_id, email_tag_id)
       VALUES ($1, $2)
       RETURNING id, email_account_id, email_tag_id`,
      [emailAccountId, tagId]
    );

    if (insertResult.rows.length === 0) {
      // This should not happen if the previous logic is correct, but as a safeguard
      throw new Error('Failed to associate tag with account.');
    }

    // Fetch the tag details to return
    const tagDetails = await client.query(
      'SELECT id, name, color, priority FROM email_tags WHERE id = $1',
      [tagId]
    );
    
    await client.query('COMMIT');
    return tagDetails.rows[0]; // Return the full tag object

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding tag to email account:', error);
    throw error; // Re-throw the error to be handled by the API layer
  } finally {
    client.release();
  }
}

// Helper to remove a tag from an email account
export async function removeTagFromEmailAccount(emailAccountId: number, tagId: number) {
  try {
    const result = await query(
      'DELETE FROM EmailAccountTags WHERE email_account_id = $1 AND email_tag_id = $2 RETURNING id',
      [emailAccountId, tagId]
    );
    return result.rows.length > 0; // Return true if a row was deleted
  } catch (error) {
    console.error('Error removing tag from email account:', error);
    throw error;
  }
}

// Helper to get email account associated with a tag
export async function getEmailAccountByTagId(tagId: number) {
  try {
    const result = await query(
      `SELECT ea.id, ea.email_address, ea.provider_type, ea.last_sync
       FROM Email_Accounts ea
       JOIN EmailAccountTags eat ON ea.id = eat.email_account_id
       WHERE eat.email_tag_id = $1`,
      [tagId]
    );
    
    return result.rows[0] || null; // Return the first match or null
  } catch (error) {
    console.error('Error getting email account by tag ID:', error);
    throw error;
  }
}
