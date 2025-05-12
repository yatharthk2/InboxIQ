import os
import json
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
import sys
from pathlib import Path

# Add the project root to the Python path to enable imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from mcp.server.fastmcp import FastMCP
from db.database import User, EmailAccount
from db.database_helper import get_db, init_db

# Define scopes needed for Gmail API - using minimum required permissions
SCOPES = ['https://www.googleapis.com/auth/gmail.send', 
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify']

# Initialize FastMCP server
mcp = FastMCP("gmail-tools")

# Database setup
DATABASE_URL = "postgresql://postgres:Bazinga#1702@localhost:5432/inboxiq"

# Replace the old init_db function
def initialize_database():
    """Initialize the database using the SQLAlchemy models"""
    init_db()

def authenticate_gmail(user_id=None, email_address=None):
    """Authenticate with Gmail API and return the service object.
    
    Args:
        user_id: The UUID of the user in the database (must be a string)
        email_address: The email address to use for this operation
    """
    creds = None
    
    # If user_id and email_address are provided, get credentials from database
    if user_id and email_address:
        db = next(get_db())
        try:
            # Ensure user_id is treated as a string
            if not isinstance(user_id, str):
                raise ValueError(f"User ID must be a string UUID, got {type(user_id)} instead")
                
            # First find the user's internal id using their UUID
            user = db.query(User).filter_by(user_id=user_id).first()
            if not user:
                raise ValueError(f"User with UUID {user_id} not found")
                
            # Use the internal id to find their email account
            email_account = db.query(EmailAccount).filter_by(
                user_id=user.id,  # Using the internal id as foreign key
                email_address=email_address
            ).first()
            
            if email_account:
                creds = Credentials.from_authorized_user_info(
                    json.loads(email_account.oauth_tokens), SCOPES)
        finally:
            db.close()
    else:
        # Legacy path for non-user-specific operations (e.g., command-line testing)
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_info(
                json.loads(open('token.json').read()), SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            
            # Update the refreshed credentials in the database
            if user_id and email_address:
                db = next(get_db())
                try:
                    # Find user by UUID
                    user = db.query(User).filter_by(user_id=user_id).first()
                    if user:
                        email_account = db.query(EmailAccount).filter_by(
                            user_id=user.id,
                            email_address=email_address
                        ).first()
                        
                        if email_account:
                            email_account.oauth_tokens = creds.to_json()
                            db.commit()
                finally:
                    db.close()
            else:
                # Legacy path for non-user-specific operations
                with open('token.json', 'w') as token:
                    token.write(creds.to_json())
        else:
            # For new integrations, this should be handled through a separate flow
            # that redirects users to authenticate with Google
            if not user_id:
                # Legacy path for testing without a user account
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
                with open('token.json', 'w') as token:
                    token.write(creds.to_json())
            else:
                raise ValueError("User needs to authenticate with Google. Use the connect_gmail_account function.")
    
    return build('gmail', 'v1', credentials=creds)

def create_message(sender, to, subject, message_text, html=False):
    """Create a message for an email."""
    message = MIMEMultipart('alternative')
    message['to'] = to
    message['from'] = sender if sender else None
    message['subject'] = subject
    
    # Create the plain-text and HTML versions of your message
    if html:
        # Attach both plain text and HTML parts
        text_part = MIMEText(message_text, 'plain')
        html_part = MIMEText(message_text, 'html')
        message.attach(text_part)
        message.attach(html_part)
    else:
        # Just plain text
        text_part = MIMEText(message_text, 'plain')
        message.attach(text_part)
    
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
    return {'raw': raw_message}

@mcp.tool()
async def connect_gmail_account(user_id: int, authorization_code: str, redirect_uri: str) -> str:
    """Connect a user's Gmail account using the authorization code from OAuth flow."""
    try:
        # Verify user exists using SQLAlchemy
        db = next(get_db())
        try:
            user = db.query(User).filter_by(id=user_id).first()
            if not user:
                return "Error: User not found"
            
            # Exchange authorization code for access and refresh tokens
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES, redirect_uri=redirect_uri)
            flow.fetch_token(code=authorization_code)
            creds = flow.credentials
            
            # Get user's email address from Google profile
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            email_address = profile['emailAddress']
            
            # Check if email account already exists
            existing_account = db.query(EmailAccount).filter_by(
                user_id=user_id, 
                email_address=email_address
            ).first()
            
            if existing_account:
                # Update existing account
                existing_account.oauth_tokens = creds.to_json()
                db.commit()
            else:
                # Create a new email account
                new_account = EmailAccount(
                    user_id=user_id,
                    email_address=email_address,
                    provider_type="gmail",
                    oauth_tokens=creds.to_json()
                )
                db.add(new_account)
                db.commit()
            
            return f"Successfully connected Gmail account: {email_address}"
        finally:
            db.close()
    except Exception as e:
        return f"Error connecting Gmail account: {str(e)}"

@mcp.tool()
async def register_user(email: str, password: str) -> str:
    """Register a new user in the system.
    
    Args:
        email: Email address for the new user
        password: Password for the new user (will be hashed)
    """
    try:
        # Use SQLAlchemy to create new user
        db = next(get_db())
        try:
            # Check if user already exists
            existing_user = db.query(User).filter_by(email=email).first()
            if existing_user:
                return "Error: User with this email already exists"
            
            # Create a simple hash of the password (in production use proper hashing)
            import hashlib
            hashed_password = hashlib.sha256(password.encode()).hexdigest()
            
            # Create new user with the required fields
            new_user = User(
                email=email,
                hashed_password=hashed_password,
                preferences={},  # Empty JSON object
                created_at=datetime.datetime.utcnow()
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            return f"User registered successfully with ID: {new_user.id}"
        finally:
            db.close()
    except Exception as e:
        return f"Error registering user: {str(e)}"

@mcp.tool()
async def list_user_email_accounts(user_id: int) -> str:
    """List all email accounts connected to a user."""
    try:
        db = next(get_db())
        try:
            # Get all email accounts for the user using SQLAlchemy
            accounts = db.query(EmailAccount).filter_by(user_id=user_id).all()
            
            if not accounts:
                return "No email accounts connected for this user."
            
            result = "Connected email accounts:\n\n"
            for account in accounts:
                result += f"ID: {account.id}\n"
                result += f"Email: {account.email_address}\n"
                result += f"Provider: {account.provider_type}\n"
                result += f"Last sync: {account.last_sync}\n"
                result += "="*40 + "\n"
            
            return result
        finally:
            db.close()
    except Exception as e:
        return f"Error listing user email accounts: {str(e)}"

@mcp.tool()
async def send_email(user_id: str, email_address: str, to: str, subject: str, body: str, html: bool = False) -> str:
    """Send an email using Gmail API.
    
    Args:
        user_id: The UUID of the user in the database
        email_address: The email address to use for sending
        to: Recipient email address or addresses (comma separated)
        subject: Email subject line
        body: Content of the email
        html: Whether to send as HTML (default: False)
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # For gmail, sender is automatically the authenticated user's email
        email_message = create_message(None, to, subject, body, html)
        sent_message = service.users().messages().send(userId='me', body=email_message).execute()
        
        return f"Email sent successfully! Message ID: {sent_message['id']}"
    except HttpError as error:
        return f"An error occurred: {error}"
    except ValueError as error:
        return f"Authentication error: {error}"

@mcp.tool()
async def search_emails(user_id: str, email_address: str, query: str, max_results: int = 5) -> str:
    """Search for emails using Gmail search syntax.
    
    Args:
        user_id: The user's ID in the database
        email_address: The email address to search in
        query: Search query using Gmail search syntax
        max_results: Maximum number of results to return (default: 5)
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # Execute search query
        results = service.users().messages().list(
            userId='me', q=query, maxResults=max_results).execute()
        
        messages = results.get('messages', [])
        
        if not messages:
            return "No messages found matching your criteria."
        
        formatted_results = []
        
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            
            # Extract headers
            headers = msg['payload']['headers']
            subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
            sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown')
            date = next((header['value'] for header in headers if header['name'].lower() == 'date'), 'Unknown')
            
            # Format the result
            formatted_results.append(
                f"Email ID: {msg['id']}\n"
                f"From: {sender}\n"
                f"Subject: {subject}\n"
                f"Date: {date}\n"
                f"Snippet: {msg['snippet']}\n"
                f"{'=' * 50}"
            )
        
        return "Search Results:\n\n" + "\n\n".join(formatted_results)
    
    except HttpError as error:
        return f"An error occurred: {error}"

@mcp.tool()
async def count_daily_emails(user_id: str, email_address: str, start_date: str, end_date: str) -> str:
    """Count emails received for each day in a date range.
    
    Args:
        user_id: The user's ID in the database
        email_address: The email address to count emails for
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # Convert string dates to datetime objects
        start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d")
        
        # Create a list of all dates in the range
        date_range = []
        current_date = start_dt
        while current_date <= end_dt:
            date_range.append(current_date.strftime("%Y-%m-%d"))
            current_date += datetime.timedelta(days=1)
        
        # Initialize results dictionary
        results = {}
        
        # Process each date in the range
        for date_str in date_range:
            # Create Gmail search query for this date (after and before)
            next_date = (datetime.datetime.strptime(date_str, "%Y-%m-%d") + 
                         datetime.timedelta(days=1)).strftime("%Y-%m-%d")
            
            query = f"after:{date_str} before:{next_date}"
            
            # Execute search query
            response = service.users().messages().list(userId='me', q=query).execute()
            messages = response.get('messages', [])
            
            # Store count in results
            results[date_str] = len(messages)
        
        # Format results as string
        output = "Email Count by Date:\n\n"
        for date_str, count in results.items():
            output += f"{date_str}: {count} emails\n"
        
        return output
    
    except HttpError as error:
        return f"An error occurred: {error}"

@mcp.tool()
async def get_email_content(user_id: str, email_address: str, email_id: str) -> str:
    """Get the full content of a specific email by its ID.
    
    Args:
        user_id: The user's ID in the database
        email_address: The email address to retrieve the email from
        email_id: The ID of the email to retrieve
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # Get the message
        message = service.users().messages().get(userId='me', id=email_id, format='full').execute()
        
        # Extract headers
        headers = message['payload']['headers']
        subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
        sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown')
        to = next((header['value'] for header in headers if header['name'].lower() == 'to'), 'Unknown')
        date = next((header['value'] for header in headers if header['name'].lower() == 'date'), 'Unknown')
        
        # Extract the message body
        body = ""
        if 'parts' in message['payload']:
            # Multipart message
            for part in message['payload']['parts']:
                if part['mimeType'] in ['text/plain', 'text/html']:
                    if 'data' in part['body']:
                        body_data = part['body']['data']
                        body += base64.urlsafe_b64decode(body_data).decode('utf-8')
                        break
        elif 'body' in message['payload'] and 'data' in message['payload']['body']:
            # Single part message
            body_data = message['payload']['body']['data']
            body = base64.urlsafe_b64decode(body_data).decode('utf-8')
        
        # Format the result
        result = (
            f"Subject: {subject}\n"
            f"From: {sender}\n"
            f"To: {to}\n"
            f"Date: {date}\n"
            f"{'=' * 50}\n\n"
            f"{body}\n"
        )
        
        return result
    
    except HttpError as error:
        return f"An error occurred: {error}"

@mcp.tool()
async def find_email_threads(user_id: str, email_address: str, email_id: str) -> str:
    """Find all emails that are part of the same conversation thread as the reference email.
    
    Args:
        user_id: The user's ID in the database
        email_address: The email address to search in
        email_id: The ID of the reference email to find related thread messages
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # Get the message to find its thread ID
        message = service.users().messages().get(userId='me', id=email_id).execute()
        thread_id = message['threadId']
        
        # Get the complete thread
        thread = service.users().threads().get(userId='me', id=thread_id).execute()
        
        # Prepare result
        messages = thread['messages']
        result = f"Found {len(messages)} messages in this thread:\n\n"
        
        for i, message in enumerate(messages, 1):
            # Extract headers
            headers = message['payload']['headers']
            subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
            sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown')
            date = next((header['value'] for header in headers if header['name'].lower() == 'date'), 'Unknown')
            
            is_current = message['id'] == email_id
            
            result += (
                f"Message {i}{' (Reference Email)' if is_current else ''}:\n"
                f"ID: {message['id']}\n"
                f"From: {sender}\n"
                f"Subject: {subject}\n"
                f"Date: {date}\n"
                f"Snippet: {message['snippet']}\n"
                f"{'=' * 50}\n\n"
            )
        
        return result
    
    except HttpError as error:
        return f"An error occurred: {error}"

@mcp.tool()
async def reply_to_thread(user_id: str, email_address: str, email_id: str, content: str, reply_all: bool = False) -> str:
    """Reply to a specific email while maintaining the conversation thread.
    
    Args:
        user_id: The user's ID in the database
        email_address: The email address to use for sending the reply
        email_id: The ID of the email to reply to
        content: Reply content
        reply_all: Whether to reply to all participants in the thread (default: False)
    """
    try:
        # Authenticate and get Gmail service
        service = authenticate_gmail(user_id, email_address)
        
        # Get the authenticated user's email
        my_email = service.users().getProfile(userId='me').execute()['emailAddress']
        
        # Get the original message
        original_message = service.users().messages().get(userId='me', id=email_id).execute()
        
        # Extract headers
        headers = original_message['payload']['headers']
        subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
        
        # If subject doesn't already have Re: prefix, add it
        if not subject.startswith('Re:'):
            subject = f"Re: {subject}"
        
        # Function to extract and filter email addresses
        def extract_emails(header_name):
            """Extract email addresses from a specific header, excluding the user's email."""
            email_headers = [header['value'] for header in headers if header['name'].lower() == header_name.lower()]
            if not email_headers:
                return []
            
            # Split and clean email addresses
            all_emails = []
            for header in email_headers:
                # Handle multiple email formats
                emails = []
                if ',' in header:
                    # Multiple emails in one header
                    emails = [addr.strip() for addr in header.split(',')]
                else:
                    emails = [header.strip()]
                
                # Extract email from potential "Name <email>" format
                emails = [email[email.find('<')+1:email.find('>')] if '<' in email else email for email in emails]
                
                # Filter out self and add unique emails
                emails = [email for email in emails if email and email != my_email]
                all_emails.extend(emails)
            
            return list(dict.fromkeys(all_emails))  # Remove duplicates while preserving order
        
        # Extract recipient emails
        from_emails = extract_emails('From')
        to_emails = extract_emails('To')
        cc_emails = extract_emails('Cc')
        
        # Determine recipients based on reply_all flag
        if reply_all:
            # Combine and deduplicate all non-self emails
            recipients = list(dict.fromkeys(from_emails + to_emails + cc_emails))
        else:
            # Prioritize From, then To
            recipients = from_emails or to_emails
        
        if not recipients:
            return "Error: Could not determine a recipient for the reply that is not yourself."
        
        # Create reply message
        message = MIMEMultipart()
        
        # Set recipients
        if reply_all:
            # Distribute recipients across To and Cc
            message['to'] = recipients[0] if recipients else ''
            if len(recipients) > 1:
                message['cc'] = ', '.join(recipients[1:])
        else:
            message['to'] = recipients[0]
        
        message['subject'] = subject
        
        # Set thread ID reference headers
        message['References'] = original_message.get('id', '')
        message['In-Reply-To'] = original_message.get('id', '')
        
        # Add content
        msg_txt = MIMEText(content)
        message.attach(msg_txt)
        
        # Create Gmail API message format
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        gmail_message = {'raw': raw_message, 'threadId': original_message['threadId']}
        
        # Send reply
        sent_message = service.users().messages().send(userId='me', body=gmail_message).execute()
        
        # Prepare recipient information for the response
        recipient_info = f"to {recipients[0]}" + (f" and {len(recipients)-1} others" if len(recipients) > 1 else "")
        
        return f"Reply sent successfully {recipient_info}! Message ID: {sent_message['id']}"
    
    except HttpError as error:
        return f"An error occurred: {error}"

if __name__ == "__main__":
    # Initialize the database
    initialize_database()
    # Run the server
    mcp.run(transport='stdio')