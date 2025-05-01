import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, redirect, url_for, session, jsonify
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management, use a better secret in production

# Define scopes needed for Gmail API
SCOPES = ['https://www.googleapis.com/auth/gmail.send', 
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify']

# PostgreSQL connection parameters
DB_PARAMS = {
    "dbname": "inboxiq",
    "user": "postgres",
    "password": "Bazinga#1702",
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    """Create a connection to PostgreSQL database."""
    conn = psycopg2.connect(**DB_PARAMS, cursor_factory=RealDictCursor)
    conn.autocommit = False
    return conn

@app.route('/auth/gmail/start', methods=['GET'])
def start_gmail_auth():
    """Start the Gmail OAuth flow."""
    # Get user_id from request
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "Missing user_id parameter"}), 400
    
    # Store user_id in session for later use
    session['user_id'] = user_id
    
    # Create OAuth flow
    client_secrets_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credentials.json')
    flow = Flow.from_client_secrets_file(
        client_secrets_file,
        scopes=SCOPES,
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    
    # Get authorization URL and state
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Force to show consent screen to get refresh token
    )
    
    # Store state in session
    session['state'] = state
    
    # Redirect user to Google's OAuth page
    return redirect(authorization_url)

@app.route('/auth/gmail/callback', methods=['GET'])
def oauth2callback():
    """Handle the callback from Google OAuth."""
    # Verify state to prevent CSRF
    if request.args.get('state') != session.get('state'):
        return jsonify({"error": "Invalid state parameter"}), 400
    
    # Get user_id from session
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No user ID in session"}), 400
    
    # Create flow object with the same redirect URI
    client_secrets_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credentials.json')
    flow = Flow.from_client_secrets_file(
        client_secrets_file,
        scopes=SCOPES,
        state=session['state'],
        redirect_uri=url_for('oauth2callback', _external=True)
    )
    
    # Exchange authorization code for credentials
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    
    # Get user's email address from Google profile
    service = build('gmail', 'v1', credentials=credentials)
    profile = service.users().getProfile(userId='me').execute()
    email_address = profile['emailAddress']
    
    # Store credentials in database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if the user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": f"User with ID {user_id} not found"}), 404
            
        # Store or update email account credentials using PostgreSQL's ON CONFLICT syntax
        cursor.execute(
            """
            INSERT INTO email_accounts (user_id, email_address, provider_type, oauth_tokens) 
            VALUES (%s, %s, %s, %s) 
            ON CONFLICT (user_id, email_address) 
            DO UPDATE SET oauth_tokens = %s, last_sync = CURRENT_TIMESTAMP
            RETURNING id
            """,
            (user_id, email_address, 'gmail', credentials.to_json(), credentials.to_json())
        )
        
        conn.commit()
        conn.close()
        
        # Redirect to success page with email information
        return redirect(f"/auth/success?email={email_address}")
    
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/auth/success', methods=['GET'])
def auth_success():
    """Show success page after successful authentication."""
    email = request.args.get('email', 'your email account')
    return f"""
    <html>
        <body>
            <h1>Authentication Successful</h1>
            <p>You have successfully connected {email} to InboxIQ!</p>
            <p>You can close this window and return to the application.</p>
        </body>
    </html>
    """

if __name__ == '__main__':
    app.run(debug=True, port=5000)
