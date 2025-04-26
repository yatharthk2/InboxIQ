Gmail API with Python
This guide will walk you through how to use the Gmail API with Python to implement various email functionality. I'll cover authentication, sending emails, reading emails, managing labels, searching, and more.
Table of Contents

Setup and Authentication
Sending Emails
Reading Emails
Searching and Filtering Emails
Managing Labels
Managing Drafts
Working with Attachments
Working with Threads
Monitoring Inbox (Push Notifications)
Error Handling and Best Practices

Setup and Authentication
Prerequisites

Python 3.6 or higher
Google Cloud Platform (GCP) project with Gmail API enabled
Appropriate credentials (OAuth 2.0 client ID)

Installing Required Libraries
bashpip install google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2
Setting Up Authentication
Creating a GCP Project and Enabling Gmail API

Go to the Google Cloud Console
Create a new project
Enable the Gmail API for your project
Configure OAuth consent screen
Create OAuth 2.0 client ID credentials
Download the client secret JSON file

Authentication in Python
pythonimport os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

def get_gmail_service():
    # Define the scopes
    SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
    
    creds = None
    # Check if token file exists
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
    
    # Build the Gmail service
    service = build('gmail', 'v1', credentials=creds)
    return service
Sending Emails
Basic Email Sending
pythonimport base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from googleapiclient.errors import HttpError

def send_email(service, to, subject, body, from_email=None):
    """Send an email using Gmail API."""
    try:
        # Create a message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Set the from email if provided
        if from_email:
            message['from'] = from_email
            
        # Add the HTML body
        msg = MIMEText(body, 'html')
        message.attach(msg)
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Send the message
        send_message = service.users().messages().send(
            userId='me', body={'raw': raw_message}).execute()
        
        print(f"Message Id: {send_message['id']}")
        return send_message
        
    except HttpError as error:
        print(f'An error occurred: {error}')
Sending Emails with Attachments
pythonimport os
from email.mime.base import MIMEBase
from email import encoders

def send_email_with_attachment(service, to, subject, body, file_path, from_email=None):
    """Send an email with an attachment using Gmail API."""
    try:
        # Create a message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Set the from email if provided
        if from_email:
            message['from'] = from_email
            
        # Add the HTML body
        msg = MIMEText(body, 'html')
        message.attach(msg)
        
        # Process the attachment
        filename = os.path.basename(file_path)
        attachment = open(file_path, 'rb')
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename= {filename}')
        message.attach(part)
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Send the message
        send_message = service.users().messages().send(
            userId='me', body={'raw': raw_message}).execute()
        
        print(f"Message Id: {send_message['id']}")
        return send_message
        
    except HttpError as error:
        print(f'An error occurred: {error}')
Sending to Multiple Recipients
pythondef send_to_multiple(service, recipients, subject, body, from_email=None):
    """Send email to multiple recipients using Gmail API."""
    # Join all recipients with commas
    to = ", ".join(recipients)
    return send_email(service, to, subject, body, from_email)
Reading Emails
Getting Email List
pythondef list_messages(service, max_results=10):
    """List the most recent emails."""
    try:
        # Get messages from inbox
        response = service.users().messages().list(
            userId='me', maxResults=max_results).execute()
        
        messages = response.get('messages', [])
        return messages
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Reading an Email
pythondef read_message(service, msg_id):
    """Read a specific message by its ID."""
    try:
        # Get the message
        message = service.users().messages().get(
            userId='me', id=msg_id).execute()
        
        # Extract headers
        headers = message['payload']['headers']
        subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
        sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown')
        
        # Extract message body
        if 'parts' in message['payload']:
            # Multipart message
            parts = message['payload']['parts']
            body = ''
            for part in parts:
                if part['mimeType'] == 'text/plain':
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                    break
        else:
            # Single part message
            if 'data' in message['payload']['body']:
                body = base64.urlsafe_b64decode(message['payload']['body']['data']).decode('utf-8')
            else:
                body = 'No body content'
        
        # Return the message details
        return {
            'id': message['id'],
            'threadId': message['threadId'],
            'labelIds': message['labelIds'],
            'snippet': message['snippet'],
            'subject': subject,
            'sender': sender,
            'body': body,
            'internalDate': message['internalDate']
        }
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Retrieving Multiple Emails
pythondef get_recent_emails(service, max_results=10):
    """Get details of recent emails."""
    messages = list_messages(service, max_results)
    email_details = []
    
    for message in messages:
        details = read_message(service, message['id'])
        if details:
            email_details.append(details)
    
    return email_details
Searching and Filtering Emails
Searching for Emails
pythondef search_messages(service, query):
    """Search for messages using Gmail's search syntax."""
    try:
        # Get messages matching the query
        response = service.users().messages().list(
            userId='me', q=query).execute()
        
        messages = response.get('messages', [])
        return messages
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Search Examples
python# Search for emails from a specific sender
emails_from_sender = search_messages(service, 'from:example@gmail.com')

# Search for emails with a specific subject
emails_with_subject = search_messages(service, 'subject:"Important Meeting"')

# Search for emails with attachments
emails_with_attachments = search_messages(service, 'has:attachment')

# Search for unread emails
unread_emails = search_messages(service, 'is:unread')

# Combined search (unread emails from a specific sender with attachments)
complex_search = search_messages(service, 'from:example@gmail.com is:unread has:attachment')
Managing Labels
Listing Labels
pythondef list_labels(service):
    """Get all labels in the user's account."""
    try:
        results = service.users().labels().list(userId='me').execute()
        labels = results.get('labels', [])
        return labels
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Creating a Label
pythondef create_label(service, name, text_color='#000000', background_color='#FFFFFF'):
    """Create a new label."""
    try:
        label_object = {
            'name': name,
            'labelListVisibility': 'labelShow',
            'messageListVisibility': 'show',
            'color': {
                'textColor': text_color,
                'backgroundColor': background_color
            }
        }
        
        created_label = service.users().labels().create(userId='me', body=label_object).execute()
        return created_label
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Updating a Label
pythondef update_label(service, label_id, name=None, text_color=None, background_color=None):
    """Update an existing label."""
    try:
        # Get the current label
        label = service.users().labels().get(userId='me', id=label_id).execute()
        
        # Update fields if provided
        if name:
            label['name'] = name
        
        if text_color or background_color:
            if 'color' not in label:
                label['color'] = {}
            
            if text_color:
                label['color']['textColor'] = text_color
            
            if background_color:
                label['color']['backgroundColor'] = background_color
        
        # Send the update
        updated_label = service.users().labels().update(
            userId='me', id=label_id, body=label).execute()
        
        return updated_label
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Deleting a Label
pythondef delete_label(service, label_id):
    """Delete a label."""
    try:
        service.users().labels().delete(userId='me', id=label_id).execute()
        return True
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
Adding/Removing Labels from Messages
pythondef modify_message_labels(service, message_id, add_labels=None, remove_labels=None):
    """Add or remove labels from a message."""
    try:
        modify_request = {}
        
        if add_labels:
            modify_request['addLabelIds'] = add_labels
        
        if remove_labels:
            modify_request['removeLabelIds'] = remove_labels
        
        if not modify_request:
            return None  # No changes requested
        
        modified_message = service.users().messages().modify(
            userId='me', id=message_id, body=modify_request).execute()
        
        return modified_message
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Managing Drafts
Creating a Draft
pythondef create_draft(service, to, subject, body, from_email=None):
    """Create a draft email."""
    try:
        # Create a message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Set the from email if provided
        if from_email:
            message['from'] = from_email
            
        # Add the HTML body
        msg = MIMEText(body, 'html')
        message.attach(msg)
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Create the draft
        draft = service.users().drafts().create(
            userId='me', body={'message': {'raw': raw_message}}).execute()
        
        print(f"Draft Id: {draft['id']}")
        return draft
        
    except HttpError as error:
        print(f'An error occurred: {error}')
Listing Drafts
pythondef list_drafts(service):
    """List all drafts."""
    try:
        results = service.users().drafts().list(userId='me').execute()
        drafts = results.get('drafts', [])
        return drafts
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Getting a Draft
pythondef get_draft(service, draft_id):
    """Get a specific draft by its ID."""
    try:
        draft = service.users().drafts().get(userId='me', id=draft_id).execute()
        return draft
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Updating a Draft
pythondef update_draft(service, draft_id, to, subject, body, from_email=None):
    """Update an existing draft."""
    try:
        # Create a message
        message = MIMEMultipart()
        message['to'] = to
        message['subject'] = subject
        
        # Set the from email if provided
        if from_email:
            message['from'] = from_email
            
        # Add the HTML body
        msg = MIMEText(body, 'html')
        message.attach(msg)
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Update the draft
        draft = service.users().drafts().update(
            userId='me', id=draft_id, body={'message': {'raw': raw_message}}).execute()
        
        return draft
        
    except HttpError as error:
        print(f'An error occurred: {error}')
Sending a Draft
pythondef send_draft(service, draft_id):
    """Send an existing draft."""
    try:
        sent_draft = service.users().drafts().send(
            userId='me', body={'id': draft_id}).execute()
        
        return sent_draft
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Deleting a Draft
pythondef delete_draft(service, draft_id):
    """Delete a draft."""
    try:
        service.users().drafts().delete(userId='me', id=draft_id).execute()
        return True
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
Working with Attachments
Downloading an Attachment
pythondef get_attachment(service, message_id, attachment_id):
    """Get an attachment from a message."""
    try:
        attachment = service.users().messages().attachments().get(
            userId='me', messageId=message_id, id=attachment_id).execute()
        
        file_data = base64.urlsafe_b64decode(attachment['data'])
        return file_data
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Saving Attachments from a Message
pythondef save_attachments(service, message_id, save_dir='.'):
    """Save all attachments from a message to a directory."""
    try:
        # Get the message
        message = service.users().messages().get(
            userId='me', id=message_id).execute()
        
        # Check if the message has parts
        if 'parts' not in message['payload']:
            return []
        
        saved_files = []
        
        # Create save directory if it doesn't exist
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
        
        # Process each part
        parts = message['payload']['parts']
        for part in parts:
            if 'filename' in part and part['filename']:
                # This part contains an attachment
                if 'body' in part and 'attachmentId' in part['body']:
                    attachment_id = part['body']['attachmentId']
                    filename = part['filename']
                    
                    # Get the attachment
                    attachment = get_attachment(service, message_id, attachment_id)
                    
                    if attachment:
                        # Save the attachment
                        filepath = os.path.join(save_dir, filename)
                        with open(filepath, 'wb') as f:
                            f.write(attachment)
                        
                        saved_files.append(filepath)
        
        return saved_files
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Identifying Messages with Attachments
pythondef find_messages_with_attachments(service, max_results=10):
    """Find messages that have attachments."""
    try:
        # Search for messages with attachments
        response = service.users().messages().list(
            userId='me', q='has:attachment', maxResults=max_results).execute()
        
        messages = response.get('messages', [])
        return messages
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Working with Threads
Getting Thread List
pythondef list_threads(service, max_results=10):
    """List the most recent threads."""
    try:
        # Get threads from inbox
        response = service.users().threads().list(
            userId='me', maxResults=max_results).execute()
        
        threads = response.get('threads', [])
        return threads
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Getting a Thread
pythondef get_thread(service, thread_id):
    """Get a specific thread by its ID."""
    try:
        thread = service.users().threads().get(userId='me', id=thread_id).execute()
        return thread
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Modify Thread Labels
pythondef modify_thread_labels(service, thread_id, add_labels=None, remove_labels=None):
    """Add or remove labels from a thread."""
    try:
        modify_request = {}
        
        if add_labels:
            modify_request['addLabelIds'] = add_labels
        
        if remove_labels:
            modify_request['removeLabelIds'] = remove_labels
        
        if not modify_request:
            return None  # No changes requested
        
        modified_thread = service.users().threads().modify(
            userId='me', id=thread_id, body=modify_request).execute()
        
        return modified_thread
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Monitoring Inbox
Using History to Track Changes
pythondef get_history(service, start_history_id):
    """Get the history of changes starting from the given history ID."""
    try:
        results = service.users().history().list(
            userId='me', startHistoryId=start_history_id).execute()
        
        history = results.get('history', [])
        return history
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Setting Up Push Notifications (Webhook)
This requires setting up a webhook endpoint on your server and configuring a Cloud Pub/Sub topic in GCP.
pythondef setup_push_notifications(service, topic_name):
    """Set up push notifications to a Cloud Pub/Sub topic."""
    try:
        # Format the topic name as required by Gmail API
        # Format should be: projects/{project_id}/topics/{topic_name}
        formatted_topic = f"projects/your-project-id/topics/{topic_name}"
        
        # Create a watch request
        request = {
            'labelIds': ['INBOX'],
            'topicName': formatted_topic,
            'labelFilterAction': 'include'
        }
        
        # Set up the watch
        response = service.users().watch(userId='me', body=request).execute()
        
        # historyId is important to track changes
        history_id = response.get('historyId')
        
        print(f"Watch setup successfully. Start tracking from historyId: {history_id}")
        return response
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
Stopping Push Notifications
pythondef stop_push_notifications(service):
    """Stop push notifications."""
    try:
        service.users().stop(userId='me').execute()
        print("Watch stopped successfully")
        return True
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
Error Handling and Best Practices
Rate Limit Handling
pythonfrom time import sleep
from googleapiclient.errors import HttpError

def rate_limit_handler(func):
    """Decorator to handle rate limiting."""
    def wrapper(*args, **kwargs):
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                return func(*args, **kwargs)
            except HttpError as error:
                if error.resp.status == 429:  # Too Many Requests
                    retry_count += 1
                    wait_time = 2 ** retry_count  # Exponential backoff
                    print(f"Rate limit hit. Retrying in {wait_time} seconds...")
                    sleep(wait_time)
                else:
                    raise
        
        # If we get here, we've exhausted our retries
        raise Exception("Maximum retry attempts reached")
    
    return wrapper

# Example usage
@rate_limit_handler
def get_emails_with_retry(service, max_results=10):
    return list_messages(service, max_results)
Batch Processing
For efficient handling of multiple operations:
pythonfrom googleapiclient.http import BatchHttpRequest

def batch_modify_messages(service, message_ids, add_labels=None, remove_labels=None):
    """Modify multiple messages in a single batch."""
    try:
        # Create a batch request
        batch = service.new_batch_http_request()
        
        # Add each message modification to the batch
        for msg_id in message_ids:
            modify_request = {}
            
            if add_labels:
                modify_request['addLabelIds'] = add_labels
            
            if remove_labels:
                modify_request['removeLabelIds'] = remove_labels
            
            batch.add(
                service.users().messages().modify(
                    userId='me', id=msg_id, body=modify_request),
                callback=lambda id, response, exception: print(f"Modified: {id}")
            )
        
        # Execute the batch
        batch.execute()
        return True
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
Pagination Handling
For handling large result sets:
pythondef list_all_messages(service, query=None):
    """List all messages matching the query."""
    try:
        all_messages = []
        page_token = None
        
        while True:
            # Get a page of messages
            response = service.users().messages().list(
                userId='me', q=query, pageToken=page_token).execute()
            
            messages = response.get('messages', [])
            all_messages.extend(messages)
            
            # Check if there are more pages
            page_token = response.get('nextPageToken')
            if not page_token:
                break
        
        return all_messages
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []
Complete Working Example
Here's a simple application that demonstrates several of the functions:
pythonfrom __future__ import print_function
import os
import pickle
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import base64
from email.mime.text import MIMEText
from googleapiclient.errors import HttpError
import datetime

# Define the scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def get_gmail_service():
    """Get an authorized Gmail API service instance."""
    creds = None
    # Check if token pickle file exists
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
    
    # Build the Gmail service
    service = build('gmail', 'v1', credentials=creds)
    return service

def send_email(service, to, subject, body):
    """Send an email."""
    try:
        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        send_message = service.users().messages().send(
            userId='me', body={'raw': raw_message}).execute()
        
        print(f"Message sent. ID: {send_message['id']}")
        return send_message
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None

def list_recent_emails(service, max_results=5):
    """List recent emails with details."""
    try:
        # Get messages
        results = service.users().messages().list(
            userId='me', maxResults=max_results).execute()
        messages = results.get('messages', [])
        
        if not messages:
            print('No messages found.')
            return []
        
        # Get details for each message
        email_list = []
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            
            # Get headers
            headers = msg['payload']['headers']
            subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
            sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown')
            date = next((header['value'] for header in headers if header['name'].lower() == 'date'), 'Unknown')
            
            # Add to list
            email_list.append({
                'id': msg['id'],
                'subject': subject,
                'sender': sender,
                'date': date,
                'snippet': msg['snippet']
            })
        
        return email_list
    
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []

def main():
    """Run the Gmail API example."""
    # Get the Gmail service
    service = get_gmail_service()
    
    # List recent emails
    print("RECENT EMAILS:")
    emails = list_recent_emails(service)
    for i, email in enumerate(emails, 1):
        print(f"\n--- Email {i} ---")
        print(f"From: {email['sender']}")
        print(f"Subject: {email['subject']}")
        print(f"Date: {email['date']}")
        print(f"Snippet: {email['snippet']}")
        print("-" * 30)
    
    # Send a test email (comment this line if you don't want to send an email)
    # send_email(service, "your-email@gmail.com", "Test from Gmail API", "This is a test email sent from the Gmail API")

if __name__ == '__main__':
    main()
Conclusion
This guide covers all the core functionality of the Gmail API in Python, including authentication, sending and reading emails, managing labels, handling drafts, working with attachments, and more. You can use these functions as building blocks for creating more complex email automation tools or integrating Gmail functionality into your applications.
Remember to handle authentication securely, implement proper error handling, and respect Gmail's API usage limits to ensure your application runs smoothly.