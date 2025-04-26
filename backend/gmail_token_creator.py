import os
import pickle
import json
import sqlite3
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Define the scopes - modify as needed
SCOPES = ['https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.labels',
          'https://www.googleapis.com/auth/gmail.modify']

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inboxiq.db')

def create_gmail_token(user_id=None, email_address=None):
    """Create Gmail API token for authentication.
    
    Args:
        user_id: Optional user ID to store token for specific user
        email_address: Optional email address to associate with this token
    """
    creds = None
    
    # If user_id is provided, try to get credentials from database
    if user_id and email_address:
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Check if the user exists
            cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
            if not cursor.fetchone():
                print(f"Error: User with ID {user_id} not found.")
                conn.close()
                return False
                
            # Check if email account already exists
            cursor.execute(
                "SELECT credentials_json FROM email_accounts WHERE user_id = ? AND email_address = ?",
                (user_id, email_address)
            )
            result = cursor.fetchone()
            
            if result:
                creds_json = result[0]
                creds = pickle.loads(creds_json) if isinstance(creds_json, bytes) else json.loads(creds_json)
            
            conn.close()
        except Exception as e:
            print(f"Database error: {e}")
    elif os.path.exists('token.pickle'):
        # Legacy path for non-user-specific operations
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    # If no valid credentials, let user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials
        if user_id and email_address:
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                
                # Store in database
                cursor.execute(
                    """
                    INSERT INTO email_accounts (user_id, email_address, credentials_json) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT (user_id, email_address) 
                    DO UPDATE SET credentials_json = ?, last_updated = CURRENT_TIMESTAMP
                    """,
                    (user_id, email_address, json.dumps(creds.to_json()), json.dumps(creds.to_json()))
                )
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"Database error when saving token: {e}")
                return False
        else:
            # Legacy path
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)
    
    # Test the credentials
    try:
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"Successfully authenticated as: {profile['emailAddress']}")
        
        # If email_address wasn't provided but we authenticated successfully, update it
        if user_id and not email_address:
            email_address = profile['emailAddress']
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO email_accounts (user_id, email_address, credentials_json) 
                    VALUES (?, ?, ?) 
                    ON CONFLICT (user_id, email_address) 
                    DO UPDATE SET credentials_json = ?, last_updated = CURRENT_TIMESTAMP
                    """,
                    (user_id, email_address, json.dumps(creds.to_json()), json.dumps(creds.to_json()))
                )
                conn.commit()
                conn.close()
            except Exception as e:
                print(f"Database error when updating email: {e}")
        
        return True
    except Exception as e:
        print(f"Error testing credentials: {e}")
        return False

if __name__ == "__main__":
    print("Gmail Token Creator")
    print("===================")
    print("This script will create a token for Gmail API access.")
    
    # Check if operating in user mode or legacy mode
    use_user_mode = input("Do you want to store the token for a specific user? (y/n): ").lower().startswith('y')
    
    if use_user_mode:
        try:
            user_id = int(input("Enter user ID: "))
            email = input("Enter user's Gmail address (or leave blank to detect): ").strip()
            email_address = email if email else None
            
            if not os.path.exists('credentials.json'):
                print("\nERROR: credentials.json not found!")
                print("Please download it from Google Cloud Console and place it in this directory.")
                print("See: https://developers.google.com/gmail/api/quickstart/python")
                exit(1)
            
            success = create_gmail_token(user_id, email_address)
            
            if success:
                print("\nToken created successfully! You can now run the email MCP server.")
            else:
                print("\nFailed to create token. Please check your credentials and try again.")
        
        except ValueError:
            print("Error: User ID must be a number.")
    else:
        # Legacy mode
        if not os.path.exists('credentials.json'):
            print("\nERROR: credentials.json not found!")
            print("Please download it from Google Cloud Console and place it in this directory.")
            print("See: https://developers.google.com/gmail/api/quickstart/python")
            exit(1)
        
        success = create_gmail_token()
        
        if success:
            print("\nToken created successfully! You can now run the email MCP server.")
        else:
            print("\nFailed to create token. Please check your credentials and try again.")