import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiKey, FiMail, FiArrowLeft } from 'react-icons/fi';
import Navbar from '@/components/Navbar'; // Assuming you have a Navbar component

type SettingsSection = 'profile' | 'llm' | 'email';

interface User {
  id: string;
  email?: string;
  name?: string; // Assuming name might be available
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');

    if (!storedUser || !token) {
      router.push('/login');
    } else {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data from localStorage", error);
        router.push('/login'); // Redirect if user data is corrupted
      } finally {
        setIsLoading(false);
      }
    }
  }, [router]);

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} />;
      case 'llm':
        return <LlmSettingsSection />;
      case 'email':
        return <EmailSettingsSection />;
      default:
        return <ProfileSection user={user} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />
      <div className="container-custom mx-auto px-4 pt-24 pb-20">
        <div className="mb-6">
           <button onClick={() => router.push('/home')} className="flex items-center text-gray-400 hover:text-white transition-colors">
             <FiArrowLeft className="mr-2" /> Back to Home
           </button>
         </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Navigation */}
          <aside className="w-full md:w-1/4">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <nav className="space-y-2">
              <SettingsNavItem
                icon={<FiUser />}
                label="Profile"
                isActive={activeSection === 'profile'}
                onClick={() => setActiveSection('profile')}
              />
              <SettingsNavItem
                icon={<FiKey />}
                label="LLM Setting"
                isActive={activeSection === 'llm'}
                onClick={() => setActiveSection('llm')}
              />
              <SettingsNavItem
                icon={<FiMail />}
                label="Email Setting"
                isActive={activeSection === 'email'}
                onClick={() => setActiveSection('email')}
              />
            </nav>
          </aside>

          {/* Right Content Area */}
          <main className="w-full md:w-3/4 bg-dark-card border border-dark-border rounded-lg p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// Navigation Item Component
interface SettingsNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SettingsNavItem: React.FC<SettingsNavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-gray-400 hover:bg-dark-card hover:text-white'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
};

// Section Components (Placeholders for now, except Profile)
const ProfileSection: React.FC<{ user: User | null }> = ({ user }) => (
  <div>
    <h3 className="text-2xl font-bold mb-6">Profile Information</h3>
    <div className="space-y-4">
       <div>
         <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
         <p className="text-lg">{user?.name || 'Not Set'}</p>
       </div>
       <div>
         <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
         <p className="text-lg">{user?.email || 'No email found'}</p>
       </div>
       {/* Add more profile fields and edit functionality later */}
    </div>
  </div>
);

const LlmSettingsSection = () => (
  <div>
    <h3 className="text-2xl font-bold mb-6">LLM Settings</h3>
    <p className="text-gray-400">Configure your Large Language Model provider and API keys here.</p>
    {/* LLM settings form will go here */}
  </div>
);

const EmailSettingsSection = () => (
  <div>
    <h3 className="text-2xl font-bold mb-6">Email Settings</h3>
    <p className="text-gray-400">Manage your connected email accounts and preferences.</p>
    {/* Email account management will go here */}
  </div>
);
