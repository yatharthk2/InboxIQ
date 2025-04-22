import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Define the scopes - modify as needed
SCOPES = ['https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.labels',
          'https://www.googleapis.com/auth/gmail.modify']

def create_gmail_token():
    """Create Gmail API token for authentication."""
    creds = None
    # Check if token.pickle exists
    if os.path.exists('token.pickle'):
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
        
        # Save the credentials for future use
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    
    # Test the credentials
    try:
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"Successfully authenticated as: {profile['emailAddress']}")
        return True
    except Exception as e:
        print(f"Error testing credentials: {e}")
        return False

if __name__ == "__main__":
    print("Gmail Token Creator")
    print("===================")
    print("This script will create a token for Gmail API access.")
    print("Make sure you have your credentials.json file in the same directory.")
    
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