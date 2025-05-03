<h1 align="center">
  InboxIQ - Email Productivity Hub
</h1>

<h2 align="center">
  A unified email management platform to streamline communication and enhance productivity
</h2>

## Overview

InboxIQ is a centralized email management platform that streamlines communication, enhances productivity, and reduces procrastination by leveraging natural language processing and agentic automation. This hub consolidates multiple email accounts, integrates with productivity tools, and provides intelligent workflows to manage emails efficiently.

## Key Features

- **Natural Language Email Handling**: Compose and send emails using conversational commands
- **Automated Workflows and Follow-Ups**: Set up routines for email threads to automate repetitive tasks
- **Intelligent Monitoring**: Get proactive notifications for action-required messages
- **Unified Email Management**: Consolidate all email accounts under one interface with tagging
- **Agentic Integrations**: Seamless integration with Google Drive, Meet, Calendar, and more

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (with npm)
* Google account for API integration
* PostgreSQL database

### Installation

* `git clone https://github.com/yourusername/inboxiq.git`
* `cd inboxiq/frontend`
* `npm install`

### Configuration

1. Create a `.env.local` file in the frontend directory with the following variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/inboxiq
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/gmail-callback
```

2. To use Gmail integration, you'll need to:
   * Create a project in Google Cloud Console
   * Enable Gmail API
   * Create OAuth 2.0 credentials
   * Set authorized redirect URIs (including `http://localhost:3000/api/auth/gmail-callback` for local development)

### Running / Development

* `npm run dev`
* Visit your app at [http://localhost:3000](http://localhost:3000).

## User Onboarding Flow

InboxIQ features a step-by-step onboarding process to help users get started:

1. **Gmail Account Connection**: Connect your Gmail account(s) securely through OAuth
2. **Email Tag Creation**: Create custom tags to organize your emails
3. **LLM Provider Selection**: Connect to an AI provider to enhance email capabilities
4. **Completion & Dashboard**: Complete setup and start using the application

## Technologies Used

- [React](https://reactjs.org/) - Frontend library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Gmail API](https://developers.google.com/gmail/api) - Email integration