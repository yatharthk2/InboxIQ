import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiUser, FiMessageSquare, FiInbox, FiSettings, FiLogOut, FiMenu, FiX, FiChevronRight, FiWifi, FiWifiOff } from 'react-icons/fi';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    }
  }, [router]);
  
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
          
          // Add bot message
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
    setInput('');
    setIsProcessing(true);
    
    try {
      // Send message through WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(input.trim());
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
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
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
            </div>
            {isConnected ? (
              <div className="mt-2 text-xs text-center text-gray-500">
                Try: "Summarize my recent emails" or "/tools" to see available commands
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
