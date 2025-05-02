import React, { useState, useEffect } from 'react';
import Button from '@/components/Button';
import { 
  FiMail, FiTag, FiLoader, FiInfo, FiCheck, FiX, 
  FiStar, FiCheckCircle, FiAlertCircle, FiPaperclip,
  FiClock, FiMessageSquare
} from 'react-icons/fi';

interface EmailTagAssignmentStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
  connectedAccounts: any[];
  tags: any[];
}

export default function EmailTagAssignmentStep({ 
  onComplete, 
  onSkip, 
  onBack,
  connectedAccounts,
  tags
}: EmailTagAssignmentStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [sampleEmails, setSampleEmails] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState({});
  const [appliedTags, setAppliedTags] = useState({});
  const [emailCategories, setEmailCategories] = useState({
    work: [],
    personal: [],
    updates: [],
    finance: [],
    other: []
  });
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [error, setError] = useState('');
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [autoTaggingComplete, setAutoTaggingComplete] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Create enhanced tags with colors and icons
  const enhancedTags = tags.map(tag => {
    // Map common categories to icons
    let icon = <FiTag />;
    if (tag.name.toLowerCase().includes('work')) icon = <FiMessageSquare />;
    if (tag.name.toLowerCase().includes('personal')) icon = <FiStar />;
    if (tag.name.toLowerCase().includes('important')) icon = <FiAlertCircle />;
    if (tag.name.toLowerCase().includes('finance')) icon = <FiPaperclip />;
    if (tag.name.toLowerCase().includes('later')) icon = <FiClock />;
    
    return {
      ...tag,
      icon
    };
  });

  useEffect(() => {
    if (connectedAccounts.length > 0 && tags.length > 0) {
      fetchSampleEmails();
    } else {
      setIsLoading(false);
    }
  }, [connectedAccounts, tags]);

  const fetchSampleEmails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Simulate API call (would be a real API call in production)
      // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated loading
      
      // Sample emails data for demonstration
      const demoEmails = [
        {
          id: 'email1',
          sender: 'notifications@github.com',
          subject: 'New pull request in your repository',
          snippet: 'A new pull request has been opened in your repository. Please review and provide feedback.',
          date: new Date().toISOString(),
          category: 'work'
        },
        {
          id: 'email2',
          sender: 'team@slack.com',
          subject: 'Weekly activity in your workspace',
          snippet: 'Here\'s a summary of activity in your Slack workspace for the past week.',
          date: new Date(Date.now() - 86400000).toISOString(),
          category: 'work'
        },
        {
          id: 'email3',
          sender: 'newsletter@medium.com',
          subject: 'Top stories for you',
          snippet: 'Check out these featured stories based on your reading history and interests.',
          date: new Date(Date.now() - 172800000).toISOString(),
          category: 'updates'
        },
        {
          id: 'email4',
          sender: 'billing@aws.amazon.com',
          subject: 'Your AWS invoice for May 2023',
          snippet: 'Your monthly AWS invoice is available. Total amount: $156.72',
          date: new Date(Date.now() - 259200000).toISOString(),
          category: 'finance'
        },
        {
          id: 'email5',
          sender: 'mom@gmail.com',
          subject: 'Family dinner this weekend',
          snippet: 'We\'re planning a family dinner this weekend. Are you available to join us?',
          date: new Date(Date.now() - 345600000).toISOString(),
          category: 'personal'
        },
        {
          id: 'email6',
          sender: 'hr@company.com',
          subject: 'Important updates to company policies',
          snippet: 'Please review the attached updated company policies that will go into effect next month.',
          date: new Date(Date.now() - 432000000).toISOString(),
          category: 'work'
        },
        {
          id: 'email7',
          sender: 'friend@gmail.com',
          subject: 'Photos from our trip',
          snippet: 'Here are the photos from our trip last weekend. Had a great time!',
          date: new Date(Date.now() - 518400000).toISOString(),
          category: 'personal'
        }
      ];
      
      setSampleEmails(demoEmails);
      
      // Group emails by category
      const categories = {
        work: [],
        personal: [],
        updates: [],
        finance: [],
        other: []
      };
      
      demoEmails.forEach(email => {
        const category = email.category || 'other';
        if (categories[category]) {
          categories[category].push(email.id);
        } else {
          categories.other.push(email.id);
        }
      });
      
      setEmailCategories(categories);
      
      // Initialize appliedTags with empty arrays
      const initialApplied = {};
      demoEmails.forEach(email => {
        initialApplied[email.id] = [];
      });
      setAppliedTags(initialApplied);
      
    } catch (err) {
      setError('Failed to load sample emails. You can skip this step and assign tags later.');
      console.error('Error fetching sample emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runAITagging = async () => {
    setAiProcessing(true);
    setIsAutoTagging(true);
    
    try {
      // This would be a real AI analysis in production
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create smart tag suggestions for each email
      const suggestions = {};
      const newAppliedTags = { ...appliedTags };
      
      sampleEmails.forEach(email => {
        // Generate tag recommendations based on email content
        const recommended = [];
        
        // Example logic for tag suggestions based on content analysis
        if (email.subject.toLowerCase().includes('pull request') || 
            email.snippet.toLowerCase().includes('repository')) {
          const workTag = tags.find(t => t.name.toLowerCase() === 'work');
          if (workTag) recommended.push({ id: workTag.id, confidence: 0.95 });
        }
        
        if (email.subject.toLowerCase().includes('invoice') || 
            email.subject.toLowerCase().includes('billing')) {
          const financeTag = tags.find(t => t.name.toLowerCase() === 'finance');
          if (financeTag) recommended.push({ id: financeTag.id, confidence: 0.90 });
        }
        
        if (email.sender.toLowerCase().includes('mom') || 
            email.subject.toLowerCase().includes('family') ||
            email.sender.toLowerCase().includes('friend')) {
          const personalTag = tags.find(t => t.name.toLowerCase() === 'personal');
          if (personalTag) recommended.push({ id: personalTag.id, confidence: 0.85 });
        }
        
        if (email.subject.toLowerCase().includes('important') || 
            email.sender.toLowerCase().includes('hr')) {
          const importantTag = tags.find(t => t.name.toLowerCase() === 'important');
          if (importantTag) recommended.push({ id: importantTag.id, confidence: 0.80 });
        }
        
        // Add more intelligent rules based on email patterns
        // This is where real ML-based analysis would happen
        
        // If no specific rules matched, suggest based on category
        if (recommended.length === 0) {
          if (email.category === 'work') {
            const workTag = tags.find(t => t.name.toLowerCase() === 'work');
            if (workTag) recommended.push({ id: workTag.id, confidence: 0.75 });
          } else if (email.category === 'personal') {
            const personalTag = tags.find(t => t.name.toLowerCase() === 'personal');
            if (personalTag) recommended.push({ id: personalTag.id, confidence: 0.75 });
          } else if (email.category === 'finance') {
            const financeTag = tags.find(t => t.name.toLowerCase() === 'finance');
            if (financeTag) recommended.push({ id: financeTag.id, confidence: 0.75 });
          }
        }
        
        // Store the recommendations
        suggestions[email.id] = recommended;
        
        // Auto-apply tags with high confidence
        recommended.forEach(rec => {
          if (rec.confidence > 0.8) {
            if (!newAppliedTags[email.id]) {
              newAppliedTags[email.id] = [rec.id];
            } else if (!newAppliedTags[email.id].includes(rec.id)) {
              newAppliedTags[email.id].push(rec.id);
            }
          }
        });
      });
      
      setSuggestedTags(suggestions);
      setAppliedTags(newAppliedTags);
      setAutoTaggingComplete(true);
    } catch (err) {
      setError('AI tagging failed. You can still assign tags manually.');
      console.error('Error during AI tagging:', err);
    } finally {
      setAiProcessing(false);
    }
  };

  const toggleTag = (emailId, tagId) => {
    setAppliedTags(prev => {
      const currentTags = [...(prev[emailId] || [])];
      const tagIndex = currentTags.indexOf(tagId);
      
      if (tagIndex === -1) {
        // Add tag
        return { ...prev, [emailId]: [...currentTags, tagId] };
      } else {
        // Remove tag
        currentTags.splice(tagIndex, 1);
        return { ...prev, [emailId]: currentTags };
      }
    });
  };

  const applyTagToAll = (tagId) => {
    const newAppliedTags = { ...appliedTags };
    
    // Apply to emails matching current filter
    let emailsToApplyTo = [...sampleEmails].map(e => e.id);
    
    if (activeCategoryFilter !== 'all') {
      emailsToApplyTo = emailCategories[activeCategoryFilter] || [];
    }
    
    emailsToApplyTo.forEach(emailId => {
      if (!newAppliedTags[emailId]) {
        newAppliedTags[emailId] = [tagId];
      } else if (!newAppliedTags[emailId].includes(tagId)) {
        newAppliedTags[emailId].push(tagId);
      }
    });
    
    setAppliedTags(newAppliedTags);
  };

  const saveTagAssignments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real implementation, this would call an API endpoint
      console.log('Saving tag assignments:', appliedTags);
      
      // Simulate API call with a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to next step
      onComplete();
    } catch (err) {
      setError('Failed to save tag assignments. You can try again or skip this step.');
      console.error('Error saving tag assignments:', err);
      setIsLoading(false);
    }
  };

  const getFilteredEmails = () => {
    if (activeCategoryFilter === 'all') {
      return sampleEmails;
    }
    
    return sampleEmails.filter(email => 
      emailCategories[activeCategoryFilter]?.includes(email.id)
    );
  };

  const getTagById = (tagId) => {
    return enhancedTags.find(tag => tag.id === tagId);
  };

  // If no accounts or tags, skip this step automatically
  if (!isLoading && (connectedAccounts.length === 0 || tags.length === 0)) {
    return (
      <div className="text-center py-6">
        <div className="mb-6">
          <FiInfo size={48} className="mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2 mt-4">No Accounts or Tags</h2>
          <p className="text-gray-400">
            You need to connect at least one email account and create at least one tag 
            before you can assign tags to emails.
          </p>
        </div>
        <Button 
          onClick={onBack}
          variant="outline"
          className="mr-4"
        >
          Go Back
        </Button>
        <Button 
          onClick={onSkip}
          variant="primary"
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Smart Email Organization</h2>
      <p className="text-gray-400 mb-6">
        Let's organize your inbox with tags. Our AI can analyze your emails and suggest appropriate tags,
        or you can assign them manually.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <FiLoader size={40} className="animate-spin text-primary mb-4" />
            <p className="text-gray-400">Loading your emails...</p>
          </div>
        </div>
      ) : (
        <>
          {!isAutoTagging && !autoTaggingComplete && (
            <div className="mb-6 bg-dark-bg p-5 rounded-lg border border-dark-border">
              <div className="flex items-start">
                <div className="text-primary mr-4 mt-1">
                  <FiInfo size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Let AI organize your emails</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    InboxIQ can analyze your emails and automatically suggest tags based on content.
                    This helps you get started with an organized inbox right away.
                  </p>
                  <Button
                    onClick={runAITagging}
                    variant="primary"
                    disabled={aiProcessing}
                  >
                    {aiProcessing ? (
                      <>
                        <FiLoader className="animate-spin mr-2" />
                        Analyzing Emails...
                      </>
                    ) : (
                      'Run AI Tagging'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {autoTaggingComplete && (
            <div className="mb-6 bg-primary/10 p-5 rounded-lg border border-primary/30">
              <div className="flex items-start">
                <div className="text-primary mr-4 mt-1">
                  <FiCheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-2">AI Tagging Complete</h3>
                  <p className="text-gray-400 text-sm">
                    We've analyzed your emails and applied tags automatically. 
                    You can adjust these tags or continue with our suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Category filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                activeCategoryFilter === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-dark-bg hover:bg-dark-border'
              }`}
            >
              All Emails
            </button>
            {Object.entries(emailCategories).map(([category, emails]) => (
              emails.length > 0 && (
                <button
                  key={category}
                  onClick={() => setActiveCategoryFilter(category)}
                  className={`px-3 py-1 rounded-full text-sm flex items-center ${
                    activeCategoryFilter === category
                      ? 'bg-primary text-white'
                      : 'bg-dark-bg hover:bg-dark-border'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className="ml-1 text-xs bg-black/20 px-1.5 rounded-full">
                    {emails.length}
                  </span>
                </button>
              )
            ))}
          </div>
          
          {/* Quick tag actions */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">Apply tag to all visible emails:</p>
            <div className="flex flex-wrap gap-2">
              {enhancedTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => applyTagToAll(tag.id)}
                  className="flex items-center bg-dark-bg hover:bg-dark-border rounded-full px-3 py-1.5 text-sm transition-all"
                >
                  <span 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  ></span>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Email list with tag assignments */}
          {getFilteredEmails().length === 0 ? (
            <div className="text-center py-6 bg-dark-bg rounded-lg border border-dark-border mb-6">
              <FiInfo size={32} className="mx-auto text-yellow-500 mb-2" />
              <p className="text-gray-400">
                No emails found in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {getFilteredEmails().map((email, index) => (
                <div key={email.id} className="bg-dark-bg rounded-lg border border-dark-border p-4">
                  <div className="flex justify-between mb-2">
                    <div className="font-medium">{email.sender}</div>
                    <div className="text-sm text-gray-500">{new Date(email.date).toLocaleDateString()}</div>
                  </div>
                  <div className="font-medium mb-1">{email.subject}</div>
                  <div className="text-sm text-gray-400 mb-3">{email.snippet}</div>
                  
                  {/* Applied tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {appliedTags[email.id]?.map(tagId => {
                      const tag = getTagById(tagId);
                      return tag ? (
                        <div 
                          key={tagId}
                          className="flex items-center bg-primary/20 text-primary rounded-full px-3 py-1 text-sm"
                        >
                          <span 
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: tag.color }}
                          ></span>
                          {tag.name}
                          <button 
                            onClick={() => toggleTag(email.id, tagId)}
                            className="ml-2 text-gray-400 hover:text-white"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ) : null;
                    })}
                    
                    {appliedTags[email.id]?.length === 0 && (
                      <div className="text-xs text-gray-500">No tags applied</div>
                    )}
                  </div>
                  
                  {/* Suggested tags */}
                  {suggestedTags[email.id]?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags[email.id]
                          .filter(suggestion => !appliedTags[email.id]?.includes(suggestion.id))
                          .map(suggestion => {
                            const tag = getTagById(suggestion.id);
                            return tag ? (
                              <button
                                key={suggestion.id}
                                onClick={() => toggleTag(email.id, suggestion.id)}
                                className="flex items-center bg-dark-card hover:bg-dark-border rounded-full px-3 py-1 text-xs transition-all"
                                title={`${Math.round(suggestion.confidence * 100)}% confidence`}
                              >
                                <span 
                                  className="w-2 h-2 rounded-full mr-2"
                                  style={{ backgroundColor: tag.color }}
                                ></span>
                                {tag.name}
                                <span className="ml-1 text-xs bg-black/20 px-1.5 rounded-full">
                                  {Math.round(suggestion.confidence * 100)}%
                                </span>
                              </button>
                            ) : null;
                          })}
                      </div>
                    </div>
                  )}
                  
                  {/* Available tags */}
                  <div className="mt-3 border-t border-dark-border pt-3">
                    <p className="text-xs text-gray-500 mb-1">Add tag:</p>
                    <div className="flex flex-wrap gap-2">
                      {enhancedTags
                        .filter(tag => !appliedTags[email.id]?.includes(tag.id))
                        .map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(email.id, tag.id)}
                            className="flex items-center bg-dark-card hover:bg-dark-border rounded-full px-2 py-1 text-xs transition-all"
                          >
                            <span 
                              className="w-2 h-2 rounded-full mr-1.5"
                              style={{ backgroundColor: tag.color }}
                            ></span>
                            {tag.name}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={onBack}
              variant="outline"
              disabled={isLoading}
            >
              Back
            </Button>
            
            <Button 
              onClick={saveTagAssignments}
              variant="primary"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save and Continue'
              )}
            </Button>
            
            <Button 
              onClick={onSkip}
              variant="outline"
              disabled={isLoading}
            >
              Skip
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
