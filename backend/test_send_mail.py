import base64
import os.path
from email.mime.text import MIMEText
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

# Gmail API scopes needed for sending emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def authenticate_gmail():
    """Authenticate with Gmail API and return the service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_info(
            json.loads(open('token.json').read()), SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    return build('gmail', 'v1', credentials=creds)

def create_message(sender, to, subject, message_text):
    """Create a message for an email."""
    message = MIMEText(message_text)
    message['to'] = to
    message['from'] = sender
    message['subject'] = subject
    raw_message = base64.urlsafe_b64encode(message.as_string().encode('utf-8'))
    return {'raw': raw_message.decode('utf-8')}

def send_email(service, user_id, message):
    """Send an email message."""
    try:
        sent_message = service.users().messages().send(userId=user_id, body=message).execute()
        print(f'Message Id: {sent_message["id"]}')
        return sent_message
    except HttpError as error:
        print(f'An error occurred: {error}')

if __name__ == '__main__':
    import json
    # Authenticate and get Gmail service
    service = authenticate_gmail()
    
    # Hard-coded email parameters
    sender = 'yatharth.casual@gmail.com'  # Update with your email
    recipient = 'yatharthkapadia2@gmail.com'  # Update with recipient email
    subject = 'Test Email from Gmail API'
    body = 'This is a test email sent using the Gmail API from InboxIQ!'
    
    # Create and send the email
    email_message = create_message(sender, recipient, subject, body)
    send_email(service, 'me', email_message)
    print("Email sent successfully!")
