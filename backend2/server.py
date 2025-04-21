from mcp.server.fastmcp import FastMCP
import os
import pickle
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
import json
from typing import List, Dict, Optional

# Initialize FastMCP server
mcp = FastMCP("gmail-server")

def get_gmail_service():
    """Get authenticated Gmail API service."""
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise Exception("No valid credentials found. Please run gmail_token_creator.py first.")
    
    return build('gmail', 'v1', credentials=creds)

@mcp.tool()
async def send_email(to: str, subject: str, body: str, html: bool = False) -> str:
    """Send an email using Gmail API.
    
    Args:
        to: Recipient email address or addresses (comma separated)
        subject: Email subject line
        body: Content of the email
        html: Whether to send as HTML (default: False)
    """
    try:
        service = get_gmail_service()
        
        # Create message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Attach body
        content_type = 'html' if html else 'plain'
        msg = MIMEText(body, content_type)
        message.attach(msg)
        
        # Encode and send message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        sent_message = service.users().messages().send(
            userId='me', 
            body={'raw': encoded_message}
        ).execute()
        
        return f"Email sent successfully! Message ID: {sent_message['id']}"
    
    except Exception as e:
        return f"Error sending email: {str(e)}"

@mcp.tool()
async def search_emails(query: str, max_results: int = 5) -> str:
    """Search for emails using Gmail search syntax.
    
    Args:
        query: Search query using Gmail search syntax
        max_results: Maximum number of results to return (default: 5)
    """
    try:
        service = get_gmail_service()
        
        # Search for messages
        response = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()
        
        messages = response.get('messages', [])
        
        if not messages:
            return "No emails found matching that query."
        
        results = []
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            
            # Extract headers
            headers = msg['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
            date = next((h['value'] for h in headers if h['name'].lower() == 'date'), 'Unknown')
            
            results.append({
                'id': msg['id'],
                'subject': subject,
                'sender': sender,
                'date': date,
                'snippet': msg['snippet']
            })
        
        # Format results
        formatted_results = ["Search Results:"]
        for i, email in enumerate(results, 1):
            formatted_results.append(f"\n--- Email {i} ---")
            formatted_results.append(f"From: {email['sender']}")
            formatted_results.append(f"Subject: {email['subject']}")
            formatted_results.append(f"Date: {email['date']}")
            formatted_results.append(f"Snippet: {email['snippet']}")
            formatted_results.append("-" * 30)
        
        return "\n".join(formatted_results)
    
    except Exception as e:
        return f"Error searching emails: {str(e)}"

@mcp.tool()
async def count_daily_emails(start_date: str, end_date: str) -> str:
    """Count emails received for each day in a date range.
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
    """
    try:
        service = get_gmail_service()
        
        # Validate date format
        # You could add more validation here
        
        # Format query for date range
        query = f"after:{start_date} before:{end_date}"
        
        # Get messages in date range
        response = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=500  # Adjust as needed
        ).execute()
        
        messages = response.get('messages', [])
        
        if not messages:
            return f"No emails found between {start_date} and {end_date}."
        
        # Count by date
        date_counts = {}
        
        for message in messages:
            msg = service.users().messages().get(
                userId='me', 
                id=message['id'], 
                format='metadata',
                metadataHeaders=['Date']
            ).execute()
            
            headers = msg['payload']['headers']
            date_header = next((h['value'] for h in headers if h['name'].lower() == 'date'), None)
            
            if date_header:
                # You might want to use a proper date parser here
                # This is a simplification
                date_parts = date_header.split()
                if len(date_parts) >= 5:
                    date_key = f"{date_parts[1]} {date_parts[2]} {date_parts[3]}"
                    date_counts[date_key] = date_counts.get(date_key, 0) + 1
        
        # Format results
        result = [f"Email counts between {start_date} and {end_date}:"]
        for date, count in date_counts.items():
            result.append(f"{date}: {count} emails")
        
        return "\n".join(result)
    
    except Exception as e:
        return f"Error counting emails: {str(e)}"

@mcp.tool()
async def get_email_content(email_id: str) -> str:
    """Get the full content of a specific email by its ID.
    
    Args:
        email_id: The ID of the email to retrieve
    """
    try:
        service = get_gmail_service()
        
        # Get the message
        message = service.users().messages().get(userId='me', id=email_id).execute()
        
        # Extract headers
        headers = message['payload']['headers']
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
        sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
        to = next((h['value'] for h in headers if h['name'].lower() == 'to'), 'Unknown')
        date = next((h['value'] for h in headers if h['name'].lower() == 'date'), 'Unknown')
        
        # Extract message body
        body = "No body content available"
        
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part['mimeType'] == 'text/plain' and 'data' in part['body']:
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    break
        elif 'body' in message['payload'] and 'data' in message['payload']['body']:
            body = base64.urlsafe_b64decode(message['payload']['body']['data']).decode('utf-8')
        
        # Format the result
        result = [
            f"Subject: {subject}",
            f"From: {sender}",
            f"To: {to}",
            f"Date: {date}",
            f"\nBody:\n{body}"
        ]
        
        return "\n".join(result)
    
    except Exception as e:
        return f"Error retrieving email content: {str(e)}"

@mcp.tool()
async def find_email_threads(email_id: str) -> str:
    """Find all emails that are part of the same conversation thread as the reference email.
    
    Args:
        email_id: The ID of the reference email to find related thread messages
    """
    try:
        service = get_gmail_service()
        
        # Get the thread ID
        message = service.users().messages().get(userId='me', id=email_id, format='minimal').execute()
        thread_id = message['threadId']
        
        # Get the full thread
        thread = service.users().threads().get(userId='me', id=thread_id).execute()
        messages = thread.get('messages', [])
        
        if not messages:
            return "No messages found in this thread."
        
        # Format the results
        results = [f"Thread with {len(messages)} messages:"]
        
        for i, msg in enumerate(messages, 1):
            # Extract headers
            headers = msg['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
            date = next((h['value'] for h in headers if h['name'].lower() == 'date'), 'Unknown')
            
            results.append(f"\n--- Message {i} ---")
            results.append(f"ID: {msg['id']}")
            results.append(f"From: {sender}")
            results.append(f"Subject: {subject}")
            results.append(f"Date: {date}")
            results.append(f"Snippet: {msg['snippet']}")
            
            # Highlight the reference email
            if msg['id'] == email_id:
                results.append("(This is the reference email)")
            
            results.append("-" * 30)
        
        return "\n".join(results)
    
    except Exception as e:
        return f"Error finding email threads: {str(e)}"

@mcp.tool()
async def reply_to_thread(email_id: str, content: str, cc: List[str] = None) -> str:
    """Reply to a specific email while maintaining the conversation thread.
    
    Args:
        email_id: The ID of the email to reply to
        content: Reply content
        cc: Optional list of CC recipient email addresses
    """
    try:
        service = get_gmail_service()
        
        # Get the original message to extract headers
        original = service.users().messages().get(userId='me', id=email_id).execute()
        
        # Extract necessary headers
        headers = original['payload']['headers']
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
        if not subject.startswith('Re:'):
            subject = f"Re: {subject}"
            
        # Get original sender for the 'to' field
        to = next((h['value'] for h in headers if h['name'].lower() == 'from'), None)
        if not to:
            return "Error: Could not determine recipient from original email"
        
        # Get the thread ID
        thread_id = original['threadId']
        
        # Create reply message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Add CC if provided
        if cc and len(cc) > 0:
            message['cc'] = ','.join(cc)
        
        # Set In-Reply-To and References headers to maintain threading
        message_id = next((h['value'] for h in headers if h['name'].lower() == 'message-id'), None)
        if message_id:
            message['In-Reply-To'] = message_id
            message['References'] = message_id
        
        # Add content
        msg = MIMEText(content)
        message.attach(msg)
        
        # Encode message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send message
        sent_message = service.users().messages().send(
            userId='me',
            body={
                'raw': encoded_message,
                'threadId': thread_id
            }
        ).execute()
        
        return f"Reply sent successfully! Message ID: {sent_message['id']}"
    
    except Exception as e:
        return f"Error sending reply: {str(e)}"

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')