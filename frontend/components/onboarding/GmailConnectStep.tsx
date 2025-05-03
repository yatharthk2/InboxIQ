import React, { useState } from 'react';
import { FiMail, FiPlus } from 'react-icons/fi';
import Button from '@/components/Button';

interface GmailConnectStepProps {
  onConnect: (account: any) => void;
  onSkip: () => void;
  connectedAccounts: any[];
  userId: string;
}

export default function GmailConnectStep({ 
  onConnect, 
  onSkip, 
  connectedAccounts,
  userId
}: GmailConnectStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const initiateGmailConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Get the OAuth URL from the backend
      const response = await fetch('/api/auth/gmail-auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get authentication URL');
      }
      
      const data = await response.json();
      
      // Open the OAuth URL in a popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.authUrl,
        'Connect Gmail',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
        setIsConnecting(false);
        return;
      }
      
      // Poll to check if the popup has been closed or if the connection was successful
      const checkConnectInterval = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(checkConnectInterval);
          
          // Check with the backend if the account was connected
          const statusResponse = await fetch('/api/auth/gmail-connection-status', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.connected) {
              onConnect(statusData.account);
            } else {
              setError('Gmail connection failed or was cancelled.');
            }
          } else {
            setError('Failed to check connection status.');
          }
          
          setIsConnecting(false);
        }
      }, 1000);
      
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An error occurred while connecting to Gmail.';
      setError(errorMessage);
      setIsConnecting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Connect Your Gmail Account</h2>
      <p className="text-gray-400 mb-6">
        Connect your Gmail account to start managing your emails more efficiently.
        InboxIQ needs your permission to read, organize, and send emails on your behalf.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {/* Connected accounts list */}
      {connectedAccounts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Connected Accounts:</h3>
          <div className="space-y-2">
            {connectedAccounts.map((account, index) => (
              <div key={index} className="flex items-center p-3 bg-dark-bg rounded-md border border-dark-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                  <FiMail className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">{account.email}</p>
                  <p className="text-xs text-green-400">Connected successfully</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Connect button */}
      <div className="flex flex-col space-y-4">
        <Button
          onClick={initiateGmailConnect}
          disabled={isConnecting}
          variant="primary"
          className="w-full flex items-center justify-center"
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <FiMail className="mr-2" />
              {connectedAccounts.length > 0 ? 'Connect Another Account' : 'Connect Gmail Account'}
            </>
          )}
        </Button>
        
        {connectedAccounts.length > 0 && (
          <Button
            onClick={onSkip}
            variant="outline"
            className="w-full"
          >
            Continue
          </Button>
        )}
        
        {connectedAccounts.length === 0 && (
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white text-sm"
          >
            Skip for now
          </button>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-400">
        <p className="mb-2">By connecting your Gmail account, you will allow InboxIQ to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Read and process your emails to provide smart organization</li>
          <li>Send emails on your behalf when you use our composition tools</li>
          <li>Modify labels and organize your inbox for better productivity</li>
        </ul>
        <p className="mt-2">
          We never store your full email content on our servers. All processing is done securely 
          and your data is never shared with third parties.
        </p>
      </div>
    </div>
  );
}
