import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiUser, FiMessageSquare, FiInbox, FiSettings, FiLogOut, FiMenu, FiX, FiChevronRight } from 'react-icons/fi';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

// Empty initial messages array - removing the welcome message
const initialMessages: Message[] = [];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar closed by default
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // Check auth status on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (!storedUser || !token) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    try {
      // Process the user's message
      // In a real implementation, this would call an API for processing
      setTimeout(() => {
        const botResponses: Record<string, string> = {
          'hello': 'Hello! How can I assist you with your emails today?',
          'hi': 'Hi there! Need any help managing your inbox?',
          'help': 'I can help you summarize emails, draft responses, organize your inbox, and more. Just let me know what you need!',
          'summarize': 'I can summarize your emails. Which email would you like me to summarize?',
          'draft': 'I can help draft an email. What would you like to say and to whom?',
          'organize': 'I can help organize your inbox. Would you like me to suggest tags or create filters?',
        };
        
        // Check for keyword matches or generate a fallback response
        let botContent = 'I\'m still learning how to respond to that. Is there something specific about your emails I can help with?';
        
        const userInputLower = input.toLowerCase();
        for (const [keyword, response] of Object.entries(botResponses)) {
          if (userInputLower.includes(keyword)) {
            botContent = response;
            break;
          }
        }
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: botContent,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botMessage]);
        setIsProcessing(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your request. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    router.push('/login');
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
      {/* Mobile toggle button - positioned outside the sidebar for better visibility */}
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
              <SidebarItem icon={<FiInbox />} text="Inbox" isActive={false} />
              <SidebarItem icon={<FiMessageSquare />} text="Chat" isActive={true} />
              <SidebarItem icon={<FiUser />} text="Profile" isActive={false} />
              <SidebarItem icon={<FiSettings />} text="Settings" isActive={false} />
            </nav>
            
            <div className="absolute bottom-5 w-full left-0 px-5">
              <button 
                onClick={handleLogout}
                className="flex items-center text-gray-400 hover:text-white transition-colors w-full p-2"
              >
                <FiLogOut className="mr-2" />
                <span>Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main chat area taking full width */}
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
          {/* Removing the welcome section with branding */}
          
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
                    : 'bg-dark-card/90 border border-dark-border mr-12'
                }`}
              >
                <p className="whitespace-pre-line">{message.content}</p>
                <span className="text-xs opacity-70 block mt-1 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-black/30 border border-dark-border rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-inner"
                disabled={isProcessing}
              />
              <button
                type="submit"
                className={`absolute right-1 top-1 bg-primary hover:bg-primary-dark p-2.5 rounded-full transition-colors ${
                  isProcessing || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'shadow-md'
                }`}
                disabled={isProcessing || !input.trim()}
              >
                <FiSend size={18} />
              </button>
            </div>
            <div className="mt-2 text-xs text-center text-gray-500">
              Try saying: "Summarize my recent emails" or "Draft an email to my team"
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type SidebarItemProps = {
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, isActive }) => {
  return (
    <div 
      className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? 'bg-primary text-white shadow-md' 
          : 'text-gray-400 hover:bg-dark-bg hover:text-white'
      }`}
    >
      <span className="mr-3">{icon}</span>
      <span>{text}</span>
      {isActive && (
        <FiChevronRight className="ml-auto" />
      )}
    </div>
  );
};
