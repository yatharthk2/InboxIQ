from typing import Any
import asyncio
from datetime import datetime, timedelta
import email
import imaplib
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
import mcp.server.stdio

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='email_client.log'
)

# Load environment variables from .env file
load_dotenv()

# Email configuration
EMAIL_CONFIG = {
    "email": os.getenv("EMAIL_ADDRESS", "your.email@gmail.com"),
    "password": os.getenv("EMAIL_PASSWORD", "your-app-specific-password"),
    "imap_server": os.getenv("IMAP_SERVER", "imap.gmail.com"),
    "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587"))
}

# Constants
SEARCH_TIMEOUT = 60  # seconds
MAX_EMAILS = 100

server = Server("email")

def format_email_summary(msg_data: tuple) -> dict:
    """Format an email message into a summary dict with basic information."""
    email_body = email.message_from_bytes(msg_data[0][1])
    
    return {
        "id": msg_data[0][0].split()[0].decode(),  # Get the email ID
        "from": email_body.get("From", "Unknown"),
        "date": email_body.get("Date", "Unknown"),
        "subject": email_body.get("Subject", "No Subject"),
    }

def format_email_content(msg_data: tuple) -> dict:
    """Format an email message into a dict with full content."""
    email_body = email.message_from_bytes(msg_data[0][1])
    
    # Extract body content
    body = ""
    if email_body.is_multipart():
        # Handle multipart messages
        for part in email_body.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode()
                break
            elif part.get_content_type() == "text/html":
                # If no plain text found, use HTML content
                if not body:
                    body = part.get_payload(decode=True).decode()
    else:
        # Handle non-multipart messages
        body = email_body.get_payload(decode=True).decode()
    
    return {
        "from": email_body.get("From", "Unknown"),
        "to": email_body.get("To", "Unknown"),
        "date": email_body.get("Date", "Unknown"),
        "subject": email_body.get("Subject", "No Subject"),
        "content": body
    }

async def search_emails_async(mail: imaplib.IMAP4_SSL, search_criteria: str) -> list[dict]:
    """Asynchronously search emails with timeout."""
    loop = asyncio.get_event_loop()
    try:
        _, messages = await loop.run_in_executor(None, lambda: mail.search(None, search_criteria))
        if not messages[0]:
            return []
            
        email_list = []
        for num in messages[0].split()[:MAX_EMAILS]:  # Limit to MAX_EMAILS
            _, msg_data = await loop.run_in_executor(None, lambda: mail.fetch(num, '(RFC822)'))
            email_list.append(format_email_summary(msg_data))
            
        return email_list
    except Exception as e:
        raise Exception(f"Error searching emails: {str(e)}")

async def get_email_content_async(mail: imaplib.IMAP4_SSL, email_id: str) -> dict:
    """Asynchronously get full content of a specific email."""
    loop = asyncio.get_event_loop()
    try:
        _, msg_data = await loop.run_in_executor(None, lambda: mail.fetch(email_id, '(RFC822)'))
        return format_email_content(msg_data)
    except Exception as e:
        raise Exception(f"Error fetching email content: {str(e)}")

async def count_emails_async(mail: imaplib.IMAP4_SSL, search_criteria: str) -> int:
    """Asynchronously count emails matching the search criteria."""
    loop = asyncio.get_event_loop()
    try:
        _, messages = await loop.run_in_executor(None, lambda: mail.search(None, search_criteria))
        return len(messages[0].split()) if messages[0] else 0
    except Exception as e:
        raise Exception(f"Error counting emails: {str(e)}")

async def send_email_async(
    to_addresses: list[str],
    subject: str,
    content: str,
    cc_addresses: list[str] | None = None
) -> None:
    """Asynchronously send an email."""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG["email"]
        msg['To'] = ', '.join(to_addresses)
        if cc_addresses:
            msg['Cc'] = ', '.join(cc_addresses)
        msg['Subject'] = subject
        
        # Add body
        msg.attach(MIMEText(content, 'plain', 'utf-8'))
        
        # Connect to SMTP server and send email
        def send_sync():
            with smtplib.SMTP(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
                server.set_debuglevel(1)  # Enable debug output
                logging.debug(f"Connecting to {EMAIL_CONFIG['smtp_server']}:{EMAIL_CONFIG['smtp_port']}")
                
                # Start TLS
                logging.debug("Starting TLS")
                server.starttls()
                
                # Login
                logging.debug(f"Logging in as {EMAIL_CONFIG['email']}")
                server.login(EMAIL_CONFIG["email"], EMAIL_CONFIG["password"])
                
                # Send email
                all_recipients = to_addresses + (cc_addresses or [])
                logging.debug(f"Sending email to: {all_recipients}")
                result = server.send_message(msg, EMAIL_CONFIG["email"], all_recipients)
                
                if result:
                    # send_message returns a dict of failed recipients
                    raise Exception(f"Failed to send to some recipients: {result}")
                
                logging.debug("Email sent successfully")
        
        # Run the synchronous send function in the executor
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, send_sync)
        
    except Exception as e:
        logging.error(f"Error in send_email_async: {str(e)}")
        raise

async def find_thread_emails_async(mail: imaplib.IMAP4_SSL, reference_id: str) -> list[dict]:
    """Find all emails in the same thread as the reference email."""
    loop = asyncio.get_event_loop()
    try:
        # First get the reference email to extract subject and headers
        _, msg_data = await loop.run_in_executor(None, lambda: mail.fetch(reference_id, '(RFC822)'))
        email_body = email.message_from_bytes(msg_data[0][1])
        
        # Extract subject and clean it from Re:, Fwd: prefixes for searching
        original_subject = email_body.get("Subject", "")
        clean_subject = original_subject
        for prefix in ["Re:", "Fwd:", "FW:", "RE:"]:
            clean_subject = clean_subject.replace(prefix, "").strip()
        
        # Get message ID and references/in-reply-to headers
        message_id = email_body.get("Message-ID", "")
        references = email_body.get("References", "")
        in_reply_to = email_body.get("In-Reply-To", "")
        
        # Build search criteria
        search_criteria = f'SUBJECT "{clean_subject}"'
        
        # Search for emails with the same subject
        _, messages = await loop.run_in_executor(None, lambda: mail.search(None, search_criteria))
        
        if not messages[0]:
            return []
            
        thread_emails = []
        for num in messages[0].split():
            # Skip if it's the reference email itself
            if num.decode() == reference_id:
                continue
                
            _, msg_data = await loop.run_in_executor(None, lambda: mail.fetch(num, '(RFC822)'))
            thread_email = format_email_summary(msg_data)
            
            # Add extra thread info
            msg = email.message_from_bytes(msg_data[0][1])
            thread_email["thread_relation"] = "Same subject"
            
            # Check if directly related by message ID
            msg_references = msg.get("References", "")
            msg_in_reply_to = msg.get("In-Reply-To", "")
            
            if message_id and (message_id in msg_references or message_id in msg_in_reply_to):
                thread_email["thread_relation"] = "Reply to reference email"
            elif ((references and msg.get("Message-ID", "") in references) or 
                  (in_reply_to and msg.get("Message-ID", "") == in_reply_to)):
                thread_email["thread_relation"] = "Reference email is a reply to this"
                
            thread_emails.append(thread_email)
            
        return thread_emails
        
    except Exception as e:
        raise Exception(f"Error finding thread emails: {str(e)}")

async def reply_to_email_async(
    mail: imaplib.IMAP4_SSL,
    email_id: str,
    reply_content: str,
    cc_addresses: list[str] | None = None
) -> None:
    """Reply to a specific email, maintaining the thread."""
    loop = asyncio.get_event_loop()
    try:
        # Get the original email
        _, msg_data = await loop.run_in_executor(None, lambda: mail.fetch(email_id, '(RFC822)'))
        original_email = email.message_from_bytes(msg_data[0][1])
        
        # Extract needed headers
        from_address = original_email.get("From", "")
        # Extract email address from "Name <email>" format if needed
        to_address = from_address
        if "<" in from_address and ">" in from_address:
            to_address = from_address[from_address.find("<")+1:from_address.find(">")]
        
        # Prepare subject with Re: prefix if not already there
        subject = original_email.get("Subject", "")
        if not subject.startswith("Re:"):
            subject = f"Re: {subject}"
            
        # Create reply message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG["email"]
        msg['To'] = to_address
        if cc_addresses:
            msg['Cc'] = ', '.join(cc_addresses)
        msg['Subject'] = subject
        
        # Add thread headers to maintain the conversation
        msg['In-Reply-To'] = original_email.get("Message-ID", "")
        
        # Combine original References with the Message-ID of the email being replied to
        references = original_email.get("References", "")
        if references:
            msg['References'] = f"{references} {original_email.get('Message-ID', '')}"
        else:
            msg['References'] = original_email.get("Message-ID", "")
            
        # Add body with quoted original message
        quoted_content = format_quoted_reply(original_email)
        full_reply = f"{reply_content}\n\n{quoted_content}"
        msg.attach(MIMEText(full_reply, 'plain', 'utf-8'))
        
        # Send the email
        def send_reply():
            with smtplib.SMTP(EMAIL_CONFIG["smtp_server"], EMAIL_CONFIG["smtp_port"]) as server:
                server.set_debuglevel(1)  # Enable debug output
                logging.debug(f"Connecting to {EMAIL_CONFIG['smtp_server']}:{EMAIL_CONFIG['smtp_port']}")
                
                # Start TLS
                logging.debug("Starting TLS")
                server.starttls()
                
                # Login
                logging.debug(f"Logging in as {EMAIL_CONFIG['email']}")
                server.login(EMAIL_CONFIG["email"], EMAIL_CONFIG["password"])
                
                # Send email
                recipients = [to_address] + (cc_addresses or [])
                logging.debug(f"Sending reply to: {recipients}")
                result = server.send_message(msg, EMAIL_CONFIG["email"], recipients)
                
                if result:
                    # send_message returns a dict of failed recipients
                    raise Exception(f"Failed to send to some recipients: {result}")
                
                logging.debug("Reply sent successfully")
        
        # Run the synchronous send function in the executor
        await loop.run_in_executor(None, send_reply)
        
    except Exception as e:
        logging.error(f"Error in reply_to_email_async: {str(e)}")
        raise

def format_quoted_reply(original_email) -> str:
    """Format the original email as a quoted reply."""
    sender = original_email.get("From", "Unknown")
    date = original_email.get("Date", "Unknown")
    
    # Extract body content
    original_body = ""
    if original_email.is_multipart():
        for part in original_email.walk():
            if part.get_content_type() == "text/plain":
                original_body = part.get_payload(decode=True).decode()
                break
    else:
        original_body = original_email.get_payload(decode=True).decode()
    
    # Format the quoted reply
    quoted_lines = [f"> {line}" for line in original_body.split('\n')]
    quoted_body = '\n'.join(quoted_lines)
    
    return f"\nOn {date}, {sender} wrote:\n{quoted_body}"

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """
    List available tools.
    Each tool specifies its arguments using JSON Schema validation.
    """
    return [
        types.Tool(
            name="search-emails",
            description="Search emails within a date range and/or with specific keywords",
            inputSchema={
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date in YYYY-MM-DD format (optional)",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date in YYYY-MM-DD format (optional)",
                    },
                    "keyword": {
                        "type": "string",
                        "description": "Keyword to search in email subject and body (optional)",
                    },
                    "folder": {
                        "type": "string",
                        "description": "Folder to search in ('inbox' or 'sent', defaults to 'inbox')",
                        "enum": ["inbox", "sent"],
                    },
                },
            },
        ),
        types.Tool(
            name="get-email-content",
            description="Get the full content of a specific email by its ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "email_id": {
                        "type": "string",
                        "description": "The ID of the email to retrieve",
                    },
                },
                "required": ["email_id"],
            },
        ),
        types.Tool(
            name="count-daily-emails",
            description="Count emails received for each day in a date range",
            inputSchema={
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date in YYYY-MM-DD format",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date in YYYY-MM-DD format",
                    },
                },
                "required": ["start_date", "end_date"],
            },
        ),
        types.Tool(
            name="send-email",
            description="CONFIRMATION STEP: Actually send the email after user confirms the details. Before calling this, first show the email details to the user for confirmation. Required fields: recipients (to), subject, and content. Optional: CC recipients.",
            inputSchema={
                "type": "object",
                "properties": {
                    "to": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of recipient email addresses (confirmed)",
                    },
                    "subject": {
                        "type": "string",
                        "description": "Confirmed email subject",
                    },
                    "content": {
                        "type": "string",
                        "description": "Confirmed email content",
                    },
                    "cc": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of CC recipient email addresses (optional, confirmed)",
                    },
                },
                "required": ["to", "subject", "content"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """
    Handle tool execution requests.
    Tools can search emails and return results.
    """
    if not arguments:
        arguments = {}
    
    try:
        if name == "send-email":
            to_addresses = arguments.get("to", [])
            subject = arguments.get("subject", "")
            content = arguments.get("content", "")
            cc_addresses = arguments.get("cc", [])
            
            if not to_addresses:
                return [types.TextContent(
                    type="text",
                    text="At least one recipient email address is required."
                )]
            
            try:
                logging.info("Attempting to send email")
                logging.info(f"To: {to_addresses}")
                logging.info(f"Subject: {subject}")
                logging.info(f"CC: {cc_addresses}")
                
                async with asyncio.timeout(SEARCH_TIMEOUT):
                    await send_email_async(to_addresses, subject, content, cc_addresses)
                    return [types.TextContent(
                        type="text",
                        text="Email sent successfully! Check email_client.log for detailed logs."
                    )]
            except asyncio.TimeoutError:
                logging.error("Operation timed out while sending email")
                return [types.TextContent(
                    type="text",
                    text="Operation timed out while sending email."
                )]
            except Exception as e:
                error_msg = str(e)
                logging.error(f"Failed to send email: {error_msg}")
                return [types.TextContent(
                    type="text",
                    text=f"Failed to send email: {error_msg}\n\nPlease check:\n1. Email and password are correct in .env\n2. SMTP settings are correct\n3. Less secure app access is enabled (for Gmail)\n4. Using App Password if 2FA is enabled"
                )]
        
        # Connect to IMAP server using predefined credentials
        mail = imaplib.IMAP4_SSL(EMAIL_CONFIG["imap_server"])
        mail.login(EMAIL_CONFIG["email"], EMAIL_CONFIG["password"])
        
        if name == "search-emails":
            # 选择文件夹
            folder = arguments.get("folder", "inbox")  # 默认选择收件箱
            if folder == "sent":
                mail.select('"[Gmail]/Sent Mail"')  # 对于 Gmail
            else:
                mail.select("inbox")
            
            # Get optional parameters
            start_date = arguments.get("start_date")
            end_date = arguments.get("end_date")
            keyword = arguments.get("keyword")
            
            # If no dates provided, default to last 7 days
            if not start_date:
                start_date = datetime.now() - timedelta(days=7)
                start_date = start_date.strftime("%d-%b-%Y")
            else:
                start_date = datetime.strptime(start_date, "%Y-%m-%d").strftime("%d-%b-%Y")
                
            if not end_date:
                end_date = datetime.now().strftime("%d-%b-%Y")
            else:
                # Convert end_date to datetime object once
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
                end_date = end_date_obj.strftime("%d-%b-%Y")
            
            # Build search criteria
            if start_date == end_date:
                # If searching for a single day
                search_criteria = f'ON "{start_date}"'
            else:
                # Calculate next day using the already converted end_date_obj
                next_day = (end_date_obj + timedelta(days=1)).strftime("%d-%b-%Y")
                search_criteria = f'SINCE "{start_date}" BEFORE "{next_day}"'
                
            if keyword:
                # Fix: Properly combine keyword search with date criteria
                keyword_criteria = f'(OR SUBJECT "{keyword}" BODY "{keyword}")'
                search_criteria = f'({keyword_criteria} {search_criteria})'
            
            logging.debug(f"Search criteria: {search_criteria}")  # Add debug logging
            
            try:
                async with asyncio.timeout(SEARCH_TIMEOUT):
                    email_list = await search_emails_async(mail, search_criteria)
                    
                if not email_list:
                    return [types.TextContent(
                        type="text",
                        text="No emails found matching the criteria."
                    )]
                
                # Format the results as a table
                result_text = "Found emails:\n\n"
                result_text += "ID | From | Date | Subject\n"
                result_text += "-" * 80 + "\n"
                
                for email in email_list:
                    result_text += f"{email['id']} | {email['from']} | {email['date']} | {email['subject']}\n"
                
                result_text += "\nUse get-email-content with an email ID to view the full content of a specific email."
                
                return [types.TextContent(
                    type="text",
                    text=result_text
                )]
                
            except asyncio.TimeoutError:
                return [types.TextContent(
                    type="text",
                    text="Search operation timed out. Please try with a more specific search criteria."
                )]
                
        elif name == "get-email-content":
            email_id = arguments.get("email_id")
            if not email_id:
                return [types.TextContent(
                    type="text",
                    text="Email ID is required."
                )]
            
            try:
                async with asyncio.timeout(SEARCH_TIMEOUT):
                    email_content = await get_email_content_async(mail, email_id)
                    
                result_text = (
                    f"From: {email_content['from']}\n"
                    f"To: {email_content['to']}\n"
                    f"Date: {email_content['date']}\n"
                    f"Subject: {email_content['subject']}\n"
                    f"\nContent:\n{email_content['content']}"
                )
                
                return [types.TextContent(
                    type="text",
                    text=result_text
                )]
                
            except asyncio.TimeoutError:
                return [types.TextContent(
                    type="text",
                    text="Operation timed out while fetching email content."
                )]
                
        elif name == "count-daily-emails":
            start_date = datetime.strptime(arguments["start_date"], "%Y-%m-%d")
            end_date = datetime.strptime(arguments["end_date"], "%Y-%m-%d")
            
            result_text = "Daily email counts:\n\n"
            result_text += "Date | Count\n"
            result_text += "-" * 30 + "\n"
            
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime("%d-%b-%Y")
                search_criteria = f'(ON "{date_str}")'
                
                try:
                    async with asyncio.timeout(SEARCH_TIMEOUT):
                        count = await count_emails_async(mail, search_criteria)
                        result_text += f"{current_date.strftime('%Y-%m-%d')} | {count}\n"
                except asyncio.TimeoutError:
                    result_text += f"{current_date.strftime('%Y-%m-%d')} | Timeout\n"
                
                current_date += timedelta(days=1)
            
            return [types.TextContent(
                type="text",
                text=result_text
            )]
                
        else:
            raise ValueError(f"Unknown tool: {name}")
            
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error: {str(e)}"
        )]
    finally:
        try:
            mail.close()
            mail.logout()
        except:
            pass

async def main():
    # Run the server using stdin/stdout streams
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="email",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())

