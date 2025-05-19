import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiUser, FiMessageSquare, FiInbox, FiSettings, FiLogOut, FiMenu, FiX, FiChevronRight, FiWifi, FiWifiOff, FiMail, FiTag } from 'react-icons/fi';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isPermissionRequest?: boolean;
  isPermissionDenied?: boolean;
  toolName?: string;
  permissionData?: {
    action: string;
    request_id: string;
    pending: boolean;
  };
  permissionDetails?: { // New field for structured permission details
    type: 'send_email' | 'search_emails' | 'unknown';
    to?: string;
    subject?: string;
    body?: string;
    query?: string;
    rawAction?: string; // Store the original action string
  };
};

// New types for email accounts and tags
type UserTag = {
  id: number;
  name: string;
  color: string;
  priority: number;
};

type EmailAccount = {
  id: number;
  email_address: string;
  provider_type: string;
  last_sync: string | null;
  tag?: UserTag | null;
};

type CommandSuggestion = {
  id: string;
  type: 'email' | 'tag';
  name: string;
  displayText: string;
  color?: string;
};

// New type for selected items
type SelectedItem = {
  type: 'email' | 'tag';
  id: string;
  value: string;
  displayText: string;
  color?: string;
  associatedEmail?: string; // Add this field to store associated email address
};

const initialMessages: Message[] = [];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  
  // New state for command suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [commandType, setCommandType] = useState<'email' | 'tag' | null>(null);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [userEmails, setUserEmails] = useState<EmailAccount[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Add new state for selected items
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  // Check auth status on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (!storedUser || !token) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
      
      // Fetch user's email accounts and tags on login
      fetchUserEmailAccounts(JSON.parse(storedUser).id, token);
      fetchUserTags(JSON.parse(storedUser).id, token);
    }
  }, [router]);
  
  // Fetch user's email accounts
  const fetchUserEmailAccounts = async (userId: string, token: string) => {
    try {
      const response = await fetch(`/api/email/integrations?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserEmails(data.integrations || []);
      }
    } catch (error) {
      console.error('Error fetching email accounts:', error);
    }
  };
  
  // Fetch user's tags
  const fetchUserTags = async (userId: string, token: string) => {
    try {
      const response = await fetch(`/api/user-tags?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching user tags:', error);
    }
  };
  
  // Connect to WebSocket
  useEffect(() => {
    if (!user) return; // Only connect if user is logged in
    
    // Create WebSocket connection
    const connectWebSocket = () => {
      setConnectionError('');
      
      // Use secure connection in production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:8000/ws`;
      
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionError('');
          
          // Clear any reconnection timeouts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };
        
        ws.onmessage = (event) => {
          console.log('Message received:', event.data);
          
          try {
            // Try to parse as JSON
            const data = JSON.parse(event.data);
            
            // Handle permission request
            if (data.type === 'permission_request') {
              let details: Message['permissionDetails'] = { type: 'unknown', rawAction: data.action };
              const actionLower = data.action.toLowerCase();

              if (actionLower.includes('send an email')) {
                details.type = 'send_email';
                const toMatch = data.action.match(/to\s+([^\s]+(?:@|\.)[^\s]+)/i);
                const subjectMatch = data.action.match(/subject\s+"([^"]+)"/i);
                const bodyMatch = data.action.match(/body\s+"([^"]+)"/i); // Basic body extraction
                if (toMatch) details.to = toMatch[1];
                if (subjectMatch) details.subject = subjectMatch[1];
                if (bodyMatch) details.body = bodyMatch[1];
              } else if (actionLower.includes('search emails') || actionLower.includes('retrieve emails') || actionLower.includes('read emails')) {
                details.type = 'search_emails';
                // Example: "Search emails for 'important documents'"
                const queryMatch = data.action.match(/(?:search|retrieve|read) emails (?:for|with|matching)\s+'([^']+)'/i);
                if (queryMatch) details.query = queryMatch[1];
              }

              const permissionMessage: Message = {
                id: Date.now().toString(),
                content: data.action, // Keep original content for fallback or detailed view
                sender: 'bot',
                timestamp: new Date(),
                isPermissionRequest: true,
                permissionData: {
                  action: data.action,
                  request_id: data.request_id,
                  pending: true
                },
                permissionDetails: details,
              };
              
              setMessages(prev => [...prev, permissionMessage]);
              return;
            }
          } catch (e) {
            // Not JSON, handle as regular message
            
            // Check for permission denied messages and format them nicely
            const permissionDeniedMatch = event.data.match(/\[Permission denied for tool ([^\]]+)\]/);
            if (permissionDeniedMatch) {
              const toolName = permissionDeniedMatch[1];
              const formattedMessage: Message = {
                id: Date.now().toString(),
                content: event.data,
                sender: 'bot',
                timestamp: new Date(),
                isPermissionDenied: true,
                toolName: toolName
              };
              
              setMessages(prev => [...prev, formattedMessage]);
              setIsProcessing(false);
              return;
            }
          }
          
          // Add regular bot message
          const botMessage: Message = {
            id: Date.now().toString(),
            content: event.data,
            sender: 'bot',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, botMessage]);
          setIsProcessing(false);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError('Connection error. Trying to reconnect...');
          setIsConnected(false);
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          if (!reconnectTimeoutRef.current) {
            setConnectionError('Connection lost. Reconnecting...');
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, 3000);
          }
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setConnectionError('Failed to connect. Retrying...');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      }
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when sidebar closes
  useEffect(() => {
    if (!isSidebarOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isSidebarOpen]);
  
  // Handle keyboard navigation for suggestions
  useEffect(() => {
    if (!showSuggestions) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : 0
        );
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSuggestions();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, selectedSuggestionIndex, suggestions]);
  
  // Filter suggestions based on user input
  const filteredSuggestions = useMemo(() => {
    if (!filterText || !suggestions.length) return suggestions;
    
    return suggestions.filter(suggestion => 
      suggestion.name.toLowerCase().includes(filterText.toLowerCase()) ||
      suggestion.displayText.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [suggestions, filterText]);
  
  // Handle input changes to detect slash command patterns
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    
    // Check for slash commands
    const match = newValue.match(/\/([a-z]*)$/);
    if (match) {
      const command = match[1].toLowerCase();
      
      // If command is partially "email" or "tags"
      if ('email'.startsWith(command)) {
        setCommandType('email');
        showEmailSuggestions();
      } else if ('tags'.startsWith(command)) {
        setCommandType('tag');
        showTagSuggestions();
      } else {
        closeSuggestions();
      }
    } else {
      // Check for continued filtering after selecting command type
      const emailFilterMatch = newValue.match(/\/email\s+(.+)$/);
      const tagFilterMatch = newValue.match(/\/tags\s+(.+)$/);
      
      if (emailFilterMatch && commandType === 'email') {
        setFilterText(emailFilterMatch[1]);
      } else if (tagFilterMatch && commandType === 'tag') {
        setFilterText(tagFilterMatch[1]);
      } else if (newValue.endsWith('/email ')) {
        setFilterText('');
      } else if (newValue.endsWith('/tags ')) {
        setFilterText('');
      } else {
        closeSuggestions();
      }
    }
  };
  
  // Show email account suggestions
  const showEmailSuggestions = () => {
    setShowSuggestions(true);
    setCommandType('email');
    setSelectedSuggestionIndex(0);
    setFilterText('');
    
    // Map email accounts to suggestion format
    const emailSuggestions: CommandSuggestion[] = userEmails.map(email => ({
      id: `email-${email.id}`,
      type: 'email',
      name: email.email_address,
      displayText: `${email.email_address} (${email.provider_type})`,
    }));
    
    setSuggestions(emailSuggestions);
  };
  
  // Show tag suggestions
  const showTagSuggestions = () => {
    setShowSuggestions(true);
    setCommandType('tag');
    setSelectedSuggestionIndex(0);
    setFilterText('');
    
    // Map tags to suggestion format
    const tagSuggestions: CommandSuggestion[] = userTags.map(tag => ({
      id: `tag-${tag.id}`,
      type: 'tag',
      name: tag.name,
      displayText: tag.name,
      color: tag.color,
    }));
    
    setSuggestions(tagSuggestions);
  };
  
  // Close the suggestions panel
  const closeSuggestions = () => {
    setShowSuggestions(false);
    setCommandType(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(0);
    setFilterText('');
  };
  
  // Handle selection of a suggestion
  const handleSelectSuggestion = async (suggestion: CommandSuggestion) => {
    const pattern = commandType === 'email' ? /\/email(\s+.+)?$/ : /\/tags(\s+.+)?$/;
    
    // Replace the command pattern with the selected suggestion
    let replacementText = '';
    
    if (suggestion.type === 'email') {
      replacementText = `${suggestion.name}`;
      // Store selected email
      setSelectedItem({
        type: 'email',
        id: suggestion.id,
        value: suggestion.name,
        displayText: suggestion.displayText,
      });
    } else {
      replacementText = `#${suggestion.name}`;
      
      // For tags, extract the numeric ID
      const tagId = suggestion.id.split('-')[1];
      
      // Set initial tag selection while we fetch the associated email
      setSelectedItem({
        type: 'tag',
        id: suggestion.id,
        value: suggestion.name,
        displayText: suggestion.displayText,
        color: suggestion.color,
      });
      
      // Fetch associated email for this tag
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await fetch(`/api/email/account-by-tag?tagId=${tagId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.emailAccount) {
              // Update the selected item with the associated email
              setSelectedItem(prev => {
                if (prev && prev.type === 'tag' && prev.id === suggestion.id) {
                  return {
                    ...prev,
                    associatedEmail: data.emailAccount.email_address
                  };
                }
                return prev;
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching associated email for tag:', error);
      }
    }
    
    // Replace command with the actual value
    const newValue = input.replace(pattern, replacementText);
    setInput(newValue);
    
    // Close suggestions
    closeSuggestions();
    
    // Focus the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing || !isConnected) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    let messageToSend = input.trim();
    
    // Format message based on selected item type (email or tag)
    if (selectedItem && user) {
      if (selectedItem.type === 'email') {
        messageToSend = `user_id: ${user.id}\nEmail address: ${selectedItem.value}\ntask: ${input.trim()}`;
      } else if (selectedItem.type === 'tag') {
        // Extract numeric ID from the tag's ID string (e.g., "tag-123" -> "123")
        const tagId = selectedItem.id.split('-')[1];
        
        // Include both tag and associated email if available
        if (selectedItem.associatedEmail) {
          messageToSend = `user_id: ${user.id}\nTag id: ${tagId}\nTag name: ${selectedItem.value}\nEmail address: ${selectedItem.associatedEmail}\ntask: ${input.trim()}`;
        } else {
          messageToSend = `user_id: ${user.id}\nTag id: ${tagId}\nTag name: ${selectedItem.value}\ntask: ${input.trim()}`;
        }
      }
    }
    
    setInput('');
    setIsProcessing(true);
    // Clear selected item when sending message
    setSelectedItem(null);
    
    try {
      // Send message through WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(messageToSend);
      } else {
        throw new Error('WebSocket is not connected');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Failed to send message. Please check your connection and try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  };
  
  const handleLogout = () => {
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    router.push('/login');
  };
  
  // Handle permission response
  const handlePermissionResponse = (requestId: string, approved: boolean) => {
    // Update the message to show the decision
    setMessages(prev => prev.map(msg => {
      if (msg.permissionData?.request_id === requestId) {
        return {
          ...msg,
          permissionData: {
            ...msg.permissionData,
            pending: false
          }
        };
      }
      return msg;
    }));
    
    // Send the response back through WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const response = {
        type: 'permission_response',
        request_id: requestId,
        approved
      };
      wsRef.current.send(JSON.stringify(response));
    }
  };
  
  // Add this function to retry the last action when permission was denied
  const handleRetryAction = (toolName: string) => {
    // Create a retry message
    const retryMessage = `I'd like to retry the ${toolName} action. Please request permission again.`;
    
    // Add the message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: retryMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Send the message to the server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(retryMessage);
    }
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gradient-to-b from-dark-bg to-black text-white overflow-hidden">
      {/* Connection status indicator */}
      <div className={`fixed top-4 right-4 z-50 flex items-center ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
        {isConnected ? <FiWifi size={16} /> : <FiWifiOff size={16} />}
        <span className="ml-2 text-xs font-medium">
          {isConnected ? 'Connected' : connectionError || 'Disconnected'}
        </span>
      </div>
      
      {/* Mobile toggle button */}
      <motion.button 
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-primary/90 hover:bg-primary text-white shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </motion.button>
      
      {/* Overlay when sidebar is open */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm md:backdrop-blur-none"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="fixed top-0 left-0 h-full z-30 bg-dark-card/95 backdrop-blur-md border-r border-dark-border w-64 p-5 shadow-2xl"
          >
            <div className="flex items-center mb-10 mt-3">
              <span className="text-primary font-bold text-2xl">Inbox</span>
              <span className="text-white font-bold text-2xl">IQ</span>
            </div>
            
            <div className="mb-6">
              <div className="bg-primary/10 rounded-lg p-3 flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{user.email || 'User'}</p>
                  <p className="text-xs text-gray-400">Free account</p>
                </div>
              </div>
            </div>
            
            <nav className="space-y-1.5 mb-8">
              <SidebarItem icon={<FiMessageSquare />} text="Chat History" isActive={router.pathname === '/home'} />
              <Link href="/settings" passHref legacyBehavior>
                <a onClick={() => setIsSidebarOpen(false)}>
                  <SidebarItem icon={<FiUser />} text="Settings" isActive={router.pathname === '/settings'} />
                </a>
              </Link>
              <SidebarItem icon={<FiLogOut />} text="Logout" isActive={false} onClick={handleLogout} />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-h-screen">
        {/* Messages container */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent"
          style={{ 
            backgroundImage: "radial-gradient(circle at center, rgba(79, 70, 229, 0.03) 0%, rgba(0, 0, 0, 0) 70%)",
            backgroundSize: "120% 120%",
            backgroundPosition: "center" 
          }}
        >
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot avatar */}
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.93 6 15.5 7.57 15.5 9.5C15.5 11.43 13.93 13 12 13C10.07 13 8.5 11.43 8.5 9.5C8.5 7.57 10.07 6 12 6ZM12 20C9.97 20 7.57 19.18 5.86 17.12C7.55 15.8 9.68 15 12 15C14.32 15 16.45 15.8 18.14 17.12C16.43 19.18 14.03 20 12 20Z" fill="currentColor"/>
                  </svg>
                </div>
              )}
              
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl rounded-2xl px-4 py-3 ${
                  message.sender === 'user' 
                    ? 'bg-primary text-white ml-12'
                    : message.isPermissionRequest 
                      ? 'bg-gradient-to-br from-amber-700/20 via-amber-800/30 to-yellow-700/20 border border-amber-600/40 backdrop-blur-md mr-12 shadow-lg'
                      : message.isPermissionDenied
                        ? 'bg-red-900/20 border border-red-700/30 backdrop-blur-sm mr-12'
                        : 'bg-dark-card/90 border border-dark-border mr-12'
                }`}
              >
                {message.isPermissionRequest ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-amber-400">
                      <svg className="w-6 h-6 mr-2.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold text-lg">Permission Required</p>
                    </div>
                    
                    {/* Enhanced permission display using permissionDetails */}
                    {message.permissionDetails?.type === 'send_email' ? (
                      <div className="mt-2 bg-dark-bg/60 rounded-lg overflow-hidden border border-indigo-700/50 shadow-inner">
                        <div className="bg-indigo-800/40 p-3 border-b border-indigo-700/60">
                          <div className="flex items-center">
                            <FiMail className="text-indigo-300 mr-2.5" size={18}/>
                            <span className="font-medium text-indigo-200 text-md">Send Email Request</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {message.permissionDetails.to && (
                            <div className="flex items-start">
                              <span className="text-gray-400 text-sm w-20 font-medium">To:</span>
                              <span className="text-indigo-300 text-sm font-semibold bg-indigo-500/20 px-2 py-0.5 rounded">{message.permissionDetails.to}</span>
                            </div>
                          )}
                          {message.permissionDetails.subject && (
                            <div className="flex items-start">
                              <span className="text-gray-400 text-sm w-20 font-medium">Subject:</span>
                              <span className="text-white text-sm">{message.permissionDetails.subject}</span>
                            </div>
                          )}
                          {message.permissionDetails.body && (
                            <div className="flex items-start">
                              <span className="text-gray-400 text-sm w-20 font-medium">Body:</span>
                              <p className="text-gray-300 text-sm bg-dark-card/50 p-2 rounded max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-border">
                                {message.permissionDetails.body}
                              </p>
                            </div>
                          )}
                           {!message.permissionDetails.to && !message.permissionDetails.subject && !message.permissionDetails.body && (
                            <p className="text-gray-300 text-sm italic">Details: {message.permissionDetails.rawAction}</p>
                          )}
                          <p className="text-amber-300/80 text-xs italic pt-2">
                            Do you authorize sending this email?
                          </p>
                        </div>
                      </div>
                    ) : message.permissionDetails?.type === 'search_emails' ? (
                      <div className="mt-2 bg-dark-bg/60 rounded-lg overflow-hidden border border-sky-700/50 shadow-inner">
                        <div className="bg-sky-800/40 p-3 border-b border-sky-700/60">
                          <div className="flex items-center">
                            <FiInbox className="text-sky-300 mr-2.5" size={18}/>
                            <span className="font-medium text-sky-200 text-md">Email Access Request</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <p className="text-gray-200">
                            The application wants to: <span className="font-semibold text-sky-300">{message.permissionDetails.rawAction?.split("\n\n")[0]}</span>
                          </p>
                          {message.permissionDetails.query && (
                            <div className="flex items-start">
                              <span className="text-gray-400 text-sm w-20 font-medium">Query:</span>
                              <span className="text-sky-300 text-sm font-semibold bg-sky-500/20 px-2 py-0.5 rounded">{message.permissionDetails.query}</span>
                            </div>
                          )}
                          <p className="text-amber-300/80 text-xs italic pt-2">
                            Do you authorize this email operation?
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Fallback for unknown or general permission requests
                      <div className="mt-2 bg-dark-bg/50 p-3 rounded-md border border-gray-600/50">
                        <p className="whitespace-pre-line text-gray-200">{message.permissionDetails?.rawAction || message.content}</p>
                        <p className="text-amber-300/80 text-xs italic pt-2">
                          Do you grant permission for this action?
                        </p>
                      </div>
                    )}
                    
                    {message.permissionData?.pending ? (
                      <div className="flex space-x-3 mt-4 pt-2 border-t border-amber-600/30">
                        <motion.button
                          whileHover={{ scale: 1.03, boxShadow: "0px 0px 15px rgba(74, 222, 128, 0.4)" }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1 py-2.5 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-400 font-semibold transition-all duration-150 shadow-md hover:shadow-green-500/30"
                          onClick={() => handlePermissionResponse(message.permissionData!.request_id, true)}
                        >
                          Allow
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03, boxShadow: "0px 0px 15px rgba(248, 113, 113, 0.4)" }}
                          whileTap={{ scale: 0.97 }}
                          className="flex-1 py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 font-semibold transition-all duration-150 shadow-md hover:shadow-red-500/30"
                          onClick={() => handlePermissionResponse(message.permissionData!.request_id, false)}
                        >
                          Deny
                        </motion.button>
                      </div>
                    ) : (
                      <p className="text-sm italic mt-3 text-center text-gray-400">
                        {message.permissionData?.pending === false ? 
                          "Your response has been recorded." : "Waiting for action..."}
                      </p>
                    )}
                  </div>
                ) : message.isPermissionDenied ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-red-500">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="font-medium">Action Blocked</p>
                    </div>
                    <p className="text-gray-300">
                      You've denied permission for the <span className="text-red-400 font-semibold">{message.toolName}</span> action.
                    </p>
                    <div className="flex space-x-2 mt-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-2 px-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 font-medium transition-colors"
                        onClick={() => handleRetryAction(message.toolName || '')}
                      >
                        Retry Action
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-line">{message.content}</p>
                    <span className="text-xs opacity-70 block mt-1 text-right">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </motion.div>
              
              {/* User avatar */}
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary ml-2 flex-shrink-0 mt-1">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.93 6 15.5 7.57 15.5 9.5C15.5 11.43 13.93 13 12 13C10.07 13 8.5 11.43 8.5 9.5C8.5 7.57 10.07 6 12 6ZM12 20C9.97 20 7.57 19.18 5.86 17.12C7.55 15.8 9.68 15 12 15C14.32 15 16.45 15.8 18.14 17.12C16.43 19.18 14.03 20 12 20Z" fill="currentColor"/>
                </svg>
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-dark-card/90 border border-dark-border rounded-2xl px-4 py-3 mr-12"
              >
                <div className="flex space-x-2 h-6 items-center">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '600ms' }}></div>
                </div>
              </motion.div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input form */}
        <div className="p-4 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={isConnected ? "Type a message or /email, /tags..." : "Connecting..."}
                className="w-full bg-black/30 border border-dark-border rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-inner"
                disabled={isProcessing || !isConnected}
              />
              <button
                type="submit"
                className={`absolute right-1 top-1 bg-primary hover:bg-primary-dark p-2.5 rounded-full transition-colors ${
                  isProcessing || !input.trim() || !isConnected ? 'opacity-50 cursor-not-allowed' : 'shadow-md'
                }`}
                disabled={isProcessing || !input.trim() || !isConnected}
              >
                <FiSend size={18} />
              </button>
              
              {/* Command suggestions overlay */}
              {showSuggestions && (
                <div 
                  ref={suggestionsRef}
                  className="absolute bottom-full left-0 mb-2 w-full max-h-60 overflow-y-auto bg-dark-card border border-dark-border rounded-lg shadow-xl z-10"
                >
                  <div className="p-2 border-b border-dark-border bg-dark-bg/50">
                    <div className="flex items-center text-sm text-primary font-medium">
                      {commandType === 'email' ? (
                        <>
                          <FiMail className="mr-2" />
                          Email Accounts
                        </>
                      ) : (
                        <>
                          <FiTag className="mr-2" />
                          Tags
                        </>
                      )}
                    </div>
                  </div>
                  
                  {isLoadingSuggestions ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-gray-400 mt-2">Loading...</p>
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      {filterText 
                        ? `No ${commandType}s found matching "${filterText}"`
                        : `No ${commandType}s available. Add some in settings.`}
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredSuggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          className={`px-3 py-2 cursor-pointer flex items-center ${
                            selectedSuggestionIndex === index 
                              ? 'bg-primary/20 text-white' 
                              : 'hover:bg-dark-bg/80'
                          }`}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          {suggestion.type === 'email' ? (
                            <FiMail className="mr-2 text-gray-400 flex-shrink-0" />
                          ) : (
                            <div 
                              className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: suggestion.color }}
                            />
                          )}
                          <span className="text-sm truncate">{suggestion.displayText}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Selected item indicator */}
            <AnimatePresence>
              {selectedItem && (
                <motion.div 
                  initial={{ opacity: 0, y: 5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 5, height: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="mt-2 overflow-hidden"
                >
                  <motion.div 
                    className={`rounded-lg p-3 relative ${
                      selectedItem.type === 'email' 
                        ? 'bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-indigo-500/10 border border-blue-500/30' 
                        : 'bg-gradient-to-r from-purple-600/10 via-purple-500/5 to-pink-500/10 border border-purple-500/30'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    initial={{ boxShadow: "0 0 0 rgba(59, 130, 246, 0)" }}
                    animate={{ 
                      boxShadow: selectedItem.type === 'email'
                        ? "0 0 15px rgba(59, 130, 246, 0.15)"
                        : "0 0 15px rgba(168, 85, 247, 0.15)"
                    }}
                    layout
                  >
                    {/* Decorative particles */}
                    {selectedItem.type === 'email' && (
                      <>
                        <motion.div 
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500/20"
                          animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 2,
                            ease: "easeInOut"
                          }}
                        />
                        <motion.div 
                          className="absolute top-1/2 -right-2 w-3 h-3 rounded-full bg-indigo-500/20"
                          animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 2.5,
                            ease: "easeInOut",
                            delay: 0.5
                          }}
                        />
                      </>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {selectedItem.type === 'email' ? (
                          <motion.div 
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ 
                              rotate: [0, -3, 3, 0],
                              scale: 1,
                              y: [0, -2, 0]
                            }}
                            transition={{
                              rotate: { 
                                repeat: Infinity, 
                                repeatType: "mirror",
                                duration: 4,
                                ease: "easeInOut",
                                times: [0, 0.2, 0.8, 1]
                              },
                              y: {
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut"
                              }
                            }}
                            className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mr-3 shadow-md"
                          >
                            <FiMail size={18} />
                          </motion.div>
                        ) : (
                          <motion.div 
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                            style={{ 
                              backgroundColor: `${selectedItem.color}20`, 
                              color: selectedItem.color 
                            }}
                          >
                            <FiTag size={16} />
                          </motion.div>
                        )}
                        <div>
                          <div className="flex items-center">
                            <div className="text-sm font-medium">
                              {selectedItem.type === 'email' ? 'Email Account' : 'Tag'}
                            </div>
                            {selectedItem.type === 'email' && (
                              <motion.div 
                                className="ml-2 w-2 h-2 rounded-full bg-green-400"
                                animate={{ 
                                  opacity: [1, 0.4, 1],
                                  scale: [1, 0.8, 1]
                                }}
                                transition={{ 
                                  repeat: Infinity, 
                                  duration: 2,
                                  ease: "easeInOut" 
                                }}
                              />
                            )}
                          </div>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className={`text-base font-medium mt-0.5 ${
                              selectedItem.type === 'email' ? 'text-blue-400' : 'text-purple-400'
                            }`}
                          >
                            {selectedItem.displayText}
                          </motion.div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className={`p-1.5 rounded-full ${
                            selectedItem.type === 'email' 
                              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
                              : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                          }`}
                          onClick={() => {
                            setSelectedItem(null);
                            setInput('');
                          }}
                          aria-label="Remove selected item"
                        >
                          <FiX size={16} />
                        </motion.button>
                      </div>
                    </div>
                    
                    {selectedItem.type === 'email' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: 0.3 }}
                        className="mt-3 text-sm text-gray-300 flex items-center bg-blue-500/5 rounded-md p-2"
                      >
                        <motion.div
                          animate={{ 
                            x: [0, 3, 0]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            repeatType: "mirror", 
                            duration: 1.5,
                            ease: "easeInOut" 
                          }}
                        >
                          <FiChevronRight size={14} className="mr-1.5 text-blue-400" />
                        </motion.div>
                        <span>Your next message will be processed for this account</span>
                      </motion.div>
                    )}
                    
                    {/* Connection line to show relationship with input field */}
                    {selectedItem.type === 'email' && (
                      <motion.div 
                        className="absolute -bottom-3 left-1/2 w-0.5 h-3 bg-gradient-to-b from-blue-400/50 to-transparent"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.5 }}
                      />
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {isConnected ? (
              <div className="mt-2 text-xs text-center text-gray-500">
                Try: "Summarize my recent emails" or type "/" to see available commands
              </div>
            ) : (
              <div className="mt-2 text-xs text-center text-red-500">
                {connectionError || "Trying to connect to server..."}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// SidebarItemProps definition
type SidebarItemProps = {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
  onClick?: () => void;
};

// SidebarItem component
const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, isActive, onClick }) => {
  return (
    <div 
      className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? 'bg-primary text-white shadow-md' 
          : 'text-gray-400 hover:bg-dark-bg hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span>{text}</span>
      {isActive && (
        <FiChevronRight className="ml-auto" />
      )}
    </div>
  );
};
