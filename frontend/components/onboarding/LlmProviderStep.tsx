import React, { useState } from 'react';
import Button from '@/components/Button';
import { FiKey, FiExternalLink, FiLoader } from 'react-icons/fi';

interface LlmProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  pricing: string;
  models: string[];
  docsUrl: string;
}

const LLM_PROVIDERS: LlmProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '/llm-providers/openai-logo.svg',
    description: 'Access to GPT-3.5 and GPT-4 models for natural language processing.',
    pricing: 'Starting at $0.0015 per 1K tokens',
    models: ['gpt-3.5-turbo', 'gpt-4'],
    docsUrl: 'https://platform.openai.com/docs/api-reference'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '/llm-providers/anthropic-logo.svg',
    description: 'Claude models focused on safety and helpfulness.',
    pricing: 'Starting at $0.0025 per 1K tokens',
    models: ['claude-2', 'claude-instant'],
    docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api'
  },
  {
    id: 'google',
    name: 'Google AI',
    logo: '/llm-providers/google-logo.svg',
    description: 'Access to PaLM and Gemini models for various NLP tasks.',
    pricing: 'Starting at $0.0010 per 1K tokens',
    models: ['gemini-pro', 'text-bison'],
    docsUrl: 'https://ai.google.dev/docs'
  }
];

interface LlmProviderStepProps {
  onSelect: (provider: any) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function LlmProviderStep({ onSelect, onSkip, onBack }: LlmProviderStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleProviderSelect = (provider: LlmProvider) => {
    setSelectedProvider(provider);
    setShowApiKeyInput(true);
    // Set default model to first in the list for this provider
    if (provider.models && provider.models.length > 0) {
      setDefaultModel(provider.models[0]);
    } else {
      setDefaultModel('');
    }
  };
  
  const handleSubmit = async () => {
    if (selectedProvider && apiKey.trim()) {
      setIsLoading(true);
      setError('');
      
      try {
        const response = await fetch('/api/llm/save-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            providerId: selectedProvider.id,
            providerName: selectedProvider.name,
            apiKey: apiKey.trim(),
            defaultModel
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save API key');
        }
        
        const data = await response.json();
        
        // Pass the complete provider info to the parent
        onSelect({
          ...selectedProvider,
          apiKey: apiKey,
          defaultModel: defaultModel,
          providerId: data.provider.id
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while saving the API key');
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Select AI Provider</h2>
      <p className="text-gray-400 mb-6">
        Choose an AI provider to power InboxIQ&apos;s intelligent features.
        You&apos;ll need an API key from your selected provider.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {!showApiKeyInput ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {LLM_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className={`
                p-4 border rounded-lg cursor-pointer transition-all
                ${selectedProvider?.id === provider.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-dark-border bg-dark-bg hover:border-gray-500'
                }
              `}
              onClick={() => handleProviderSelect(provider)}
            >
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2">
                  {/* Placeholder for logo */}
                  <div className="text-xl font-bold text-gray-800">{provider.name.substring(0, 2)}</div>
                </div>
              </div>
              <h3 className="text-center text-lg font-medium mb-2">{provider.name}</h3>
              <p className="text-sm text-gray-400 mb-3">{provider.description}</p>
              <div className="text-xs text-gray-500">
                <p>Pricing: {provider.pricing}</p>
                <p>Models: {provider.models.join(', ')}</p>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center mt-3 text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Documentation <FiExternalLink className="ml-1" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : selectedProvider ? (
        <div className="bg-dark-bg border border-dark-border rounded-lg p-5 mb-6">
          <h3 className="text-lg font-medium mb-3">Connect {selectedProvider.name}</h3>
          <p className="text-sm text-gray-400 mb-4">
            Enter your API key to connect with {selectedProvider.name}.
            Your API key will be encrypted and stored securely.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiKey />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-black border border-dark-border rounded-md"
                placeholder="Enter your API key here"
              />
            </div>
          </div>
          
          {selectedProvider.models && selectedProvider.models.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Default Model</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-3 py-3 bg-black border border-dark-border rounded-md"
              >
                {selectedProvider.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This model will be used by default for all LLM operations.
              </p>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setSelectedProvider(null);
                setShowApiKeyInput(false);
                setApiKey('');
                setDefaultModel('');
              }}
              className="text-gray-400 hover:text-white"
              disabled={isLoading}
            >
              Back to provider selection
            </button>
            <a
              href={selectedProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center"
            >
              How to get a key <FiExternalLink className="ml-1" />
            </a>
          </div>
        </div>
      ) : null}
      
      <div className="flex gap-4">
        <Button 
          onClick={onBack}
          variant="outline"
          disabled={isLoading}
        >
          Back
        </Button>
        
        {showApiKeyInput ? (
          <Button 
            onClick={handleSubmit}
            variant="primary"
            className="flex-1"
            disabled={!apiKey.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Connecting...
              </>
            ) : (
              'Connect and Continue'
            )}
          </Button>
        ) : (
          <Button 
            onClick={onSkip}
            variant="primary"
            className="flex-1"
          >
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}
