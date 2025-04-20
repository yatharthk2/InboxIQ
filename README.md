# EmailIQ

EmailIQ is an intelligent email management platform that helps you organize, prioritize, and respond to emails efficiently. With a clean Notion-inspired interface and powerful AI capabilities, EmailIQ transforms your email experience.

## Features

- **Smart Inbox Management**: Automatically categorize and prioritize emails
- **AI-Powered Responses**: Generate quick responses based on email content
- **Beautiful Interface**: Clean, minimalist design inspired by Notion
- **Analytics**: Track email patterns and optimize your communication
- **OAuth Authentication**: Secure login via Google authentication
- **Groq-Powered Email Assistant**: Natural language interface to your email powered by Groq AI

## Technology Stack

- React
- TypeScript
- Vite
- OAuth 2.0 for authentication
- Groq API for natural language processing
- MCP (Modal Communication Protocol) for tool management

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. For the Email AI Assistant:
   - Copy `.env.example` to `.env` and fill in your credentials
   - Install Python dependencies: `pip install -r requirements.txt`
   - Start the MCP server: `python backend/email_server.py`
   - In another terminal, start the MCP-Groq client: `python backend/mcp-groq-client.py`
4. For the web interface, start the development server with `npm run dev`

## Email Assistant Usage

The Email Assistant supports natural language commands like:
- "Show me emails from last week containing 'meeting'"
- "Get the content of email with ID 42"
- "Count how many emails I received each day last week"
- "Draft an email to john@example.com about our project status"

### Using the MCP-Groq Client

The MCP-Groq client provides a command-line interface to interact with your email using natural language:

1. Make sure your `.env` file contains the required credentials:
   - `GROQ_API_KEY`: Your Groq API key
   - `GROQ_MODEL`: The model to use (e.g., "llama3-70b-8192")
   - Email credentials as specified in `.env.example`

2. Start the client:
   ```
   python backend/mcp-groq-client.py
   ```

3. Type your requests in natural language and see the assistant respond.
   
4. Type 'exit' to quit the assistant.

## Authentication

EmailIQ uses Google OAuth for secure authentication. Users can sign in with their Google accounts without needing to create separate credentials.

## License

MIT