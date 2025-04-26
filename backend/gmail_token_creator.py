import os
import pickle
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Define the scopes - modify as needed
SCOPES = ['https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.labels',
          'https://www.googleapis.com/auth/gmail.modify']

def create_gmail_token(user_id=None, email_address=None):
    """Create Gmail API token for authentication.
    
    Args:
        user_id: Optional user ID to use in the token filename
        email_address: Optional email address to use in the token filename
    """
    creds = None
    
    # Determine the token filename
    if user_id and email_address:
        token_filename = f'token_{user_id}_{email_address.replace("@", "_at_")}.json'
    else:
        token_filename = 'token.json'
    
    # Try to load existing token if it exists
    if os.path.exists(token_filename):
        try:
            with open(token_filename, 'r') as token_file:
                creds_data = json.load(token_file)
                # Convert the JSON data back to credentials
                creds = InstalledAppFlow.from_client_config({
                    "installed": creds_data
                }, SCOPES).credentials
        except Exception as e:
            print(f"Error loading existing token: {e}")
    # For backward compatibility, check for pickle file
    elif os.path.exists('token.pickle') and not user_id and not email_address:
        try:
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
        except Exception as e:
            print(f"Error loading legacy token: {e}")
    
    # If no valid credentials, let user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save the credentials locally as JSON
        try:
            with open(token_filename, 'w') as token:
                json.dump(json.loads(creds.to_json()), token, indent=2)
            print(f"Token saved locally as {token_filename}")
        except Exception as e:
            print(f"Error when saving token: {e}")
            return False
    
    # Test the credentials
    try:
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"Successfully authenticated as: {profile['emailAddress']}")
        
        # If email_address wasn't provided but we authenticated successfully, update it
        if user_id and not email_address:
            email_address = profile['emailAddress']
            new_token_filename = f'token_{user_id}_{email_address.replace("@", "_at_")}.json'
            
            # Save with the updated filename
            try:
                with open(new_token_filename, 'w') as token:
                    json.dump(json.loads(creds.to_json()), token, indent=2)
                print(f"Token also saved as {new_token_filename}")
            except Exception as e:
                print(f"Error when saving token with updated email: {e}")
        
        return True
    except Exception as e:
        print(f"Error testing credentials: {e}")
        return False

if __name__ == "__main__":
    print("Gmail Token Creator")
    print("===================")
    print("This script will create a token for Gmail API access.")
    
    # Check if operating in user mode or legacy mode
    use_user_mode = input("Do you want to create a user-specific token? (y/n): ").lower().startswith('y')
    
    if use_user_mode:
        try:
            user_id = input("Enter user identifier: ")
            email = input("Enter Gmail address (or leave blank to detect): ").strip()
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
        
        except ValueError as e:
            print(f"Error: {e}")
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