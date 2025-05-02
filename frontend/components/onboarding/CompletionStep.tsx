import React from 'react';
import Button from '@/components/Button';
import { FiCheckCircle, FiMail, FiTag, FiKey } from 'react-icons/fi';

interface CompletionStepProps {
  onFinish: () => void;
  accounts: any[];
  tags: any[];
  llmProvider: any;
}

export default function CompletionStep({ onFinish, accounts, tags, llmProvider }: CompletionStepProps) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center border border-primary">
          <FiCheckCircle size={48} className="text-primary" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
      <p className="text-gray-400 mb-8">
        You're all set to start using InboxIQ. Here's a summary of what you've configured:
      </p>
      
      <div className="bg-dark-bg border border-dark-border rounded-lg p-5 mb-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="text-left">
            <div className="flex items-center mb-2">
              <FiMail className="mr-2 text-primary" />
              <h3 className="font-medium">Email Accounts</h3>
            </div>
            {accounts.length > 0 ? (
              <ul className="text-sm text-gray-400">
                {accounts.map((account, index) => (
                  <li key={index} className="mb-1">
                    ✓ {account.email_address || account.email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No accounts connected yet</p>
            )}
          </div>
          
          <div className="text-left">
            <div className="flex items-center mb-2">
              <FiTag className="mr-2 text-primary" />
              <h3 className="font-medium">Email Tags</h3>
            </div>
            {tags.length > 0 ? (
              <ul className="text-sm text-gray-400">
                {tags.slice(0, 5).map((tag, index) => (
                  <li key={index} className="mb-1 flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    ></span>
                    {tag.name}
                  </li>
                ))}
                {tags.length > 5 && (
                  <li className="text-gray-500">+{tags.length - 5} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No tags created yet</p>
            )}
          </div>
          
          <div className="text-left">
            <div className="flex items-center mb-2">
              <FiKey className="mr-2 text-primary" />
              <h3 className="font-medium">AI Provider</h3>
            </div>
            {llmProvider ? (
              <div className="text-sm text-gray-400">
                <p className="font-medium text-white">{llmProvider.name}</p>
                <p>API key: ••••••••••••{llmProvider.apiKey.slice(-4)}</p>
                <p>Models: {llmProvider.models.join(', ')}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No AI provider selected yet</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="font-medium mb-2">Here's what you can do next:</h3>
        <ul className="text-gray-400 text-left space-y-2">
          <li className="flex items-start">
            <span className="inline-block bg-primary/20 text-primary rounded-full p-1 mr-2 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </span>
            <span>Check your inbox and start organizing your emails</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block bg-primary/20 text-primary rounded-full p-1 mr-2 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </span>
            <span>Set up automated workflows to handle repetitive tasks</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block bg-primary/20 text-primary rounded-full p-1 mr-2 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </span>
            <span>Try using natural language commands to manage your email</span>
          </li>
        </ul>
      </div>
      
      <Button 
        onClick={onFinish}
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
      >
        Take Me to Dashboard
      </Button>
    </div>
  );
}
