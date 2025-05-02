import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import GmailConnectStep from '@/components/onboarding/GmailConnectStep';
import TagCreationStep from '@/components/onboarding/TagCreationStep';
import LlmProviderStep from '@/components/onboarding/LlmProviderStep';
import CompletionStep from '@/components/onboarding/CompletionStep';

// Define the onboarding steps
const STEPS = {
  GMAIL_CONNECT: 0,
  TAG_CREATION: 1,
  LLM_PROVIDER: 2,
  COMPLETION: 3
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(STEPS.GMAIL_CONNECT);
  const [user, setUser] = useState(null);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedLlmProvider, setSelectedLlmProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (!storedUser || !token) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
    }
  }, [router]);

  const goToNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const skipToCompletion = () => {
    setCurrentStep(STEPS.COMPLETION);
  };

  const handleGmailConnect = (account) => {
    setConnectedAccounts(prev => [...prev, account]);
    goToNextStep();
  };

  const handleTagsCreated = (createdTags) => {
    setTags(createdTags);
    goToNextStep();
  };

  const handleLlmProviderSelected = (provider) => {
    setSelectedLlmProvider(provider);
    goToNextStep();
  };

  const finishOnboarding = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />

      <div className="container-custom mx-auto px-4 pt-24 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              {Object.values(STEPS).map((step, index) => (
                <div 
                  key={index} 
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full 
                    ${currentStep >= step ? 'bg-primary' : 'bg-dark-card border border-dark-border'}`}
                >
                  {currentStep > step ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm">{step + 1}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="w-full bg-dark-card rounded-full h-2 mb-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / (Object.keys(STEPS).length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current step content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-dark-card rounded-xl p-6 border border-dark-border"
          >
            {currentStep === STEPS.GMAIL_CONNECT && (
              <GmailConnectStep 
                onConnect={handleGmailConnect} 
                onSkip={goToNextStep}
                connectedAccounts={connectedAccounts}
                userId={user?.id}
              />
            )}
            {currentStep === STEPS.TAG_CREATION && (
              <TagCreationStep 
                onComplete={handleTagsCreated} 
                onSkip={goToNextStep}
                onBack={goToPreviousStep}
              />
            )}
            {currentStep === STEPS.LLM_PROVIDER && (
              <LlmProviderStep 
                onSelect={handleLlmProviderSelected} 
                onSkip={goToNextStep}
                onBack={goToPreviousStep}
              />
            )}
            {currentStep === STEPS.COMPLETION && (
              <CompletionStep 
                onFinish={finishOnboarding}
                accounts={connectedAccounts}
                tags={tags}
                llmProvider={selectedLlmProvider}
              />
            )}
          </motion.div>

          {/* Skip button */}
          {currentStep < STEPS.COMPLETION && (
            <div className="text-center mt-4">
              <button 
                onClick={skipToCompletion} 
                className="text-sm text-gray-400 hover:text-white"
              >
                Skip all steps and go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
