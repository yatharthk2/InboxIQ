import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiKey, FiMail, FiArrowLeft, FiPlusCircle, FiEdit, FiTrash2 } from 'react-icons/fi';
import Navbar from '@/components/Navbar'; // Assuming you have a Navbar component

type SettingsSection = 'profile' | 'llm' | 'email';

interface User {
  id: string;
  email?: string;
  name?: string; // Assuming name might be available
}

// Define interface for LLM Integration data
interface LlmIntegration {
  key_id: number;
  provider_id: number;
  is_active: boolean;
  default_model: string | null;
  last_used: string | null; // Assuming timestamp string
  provider_name: string;
  provider_display_name: string;
  provider_logo_url: string | null;
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
        // Pass user ID to LlmSettingsSection
        return <LlmSettingsSection userId={user?.id} />;
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

const LlmSettingsSection: React.FC<{ userId?: string }> = ({ userId }) => {
  const [integrations, setIntegrations] = useState<LlmIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      if (!userId) {
        setError("User ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Actual API call to fetch integrations
        const response = await fetch(`/api/llm/integrations?userId=${encodeURIComponent(userId)}`); // Use your actual API endpoint

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch integrations' }));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Assuming the API returns { integrations: LlmIntegration[] }
        setIntegrations(data.integrations || []);

      } catch (err: any) {
        console.error("Failed to fetch LLM integrations:", err);
        setError(err.message || "An error occurred while fetching integrations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrations();
  }, [userId]); // Re-fetch if userId changes

  const handleAddIntegration = () => {
    // TODO: Implement logic to add a new integration (e.g., open a modal)
    console.log("Add new integration clicked");
  };

  const handleEditIntegration = (keyId: number) => {
    // TODO: Implement logic to edit an existing integration
    console.log(`Edit integration clicked for key ID: ${keyId}`);
  };

  const handleDeleteIntegration = (keyId: number) => {
    // TODO: Implement logic to delete an integration (with confirmation)
    console.log(`Delete integration clicked for key ID: ${keyId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">LLM Settings</h3>
        <button
          onClick={handleAddIntegration}
          className="flex items-center bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <FiPlusCircle className="mr-2" /> Add Integration
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4">
          <p>Error: {error}</p>
        </div>
      )}

      {!isLoading && !error && integrations.length === 0 && (
        <div className="text-center py-10 px-6 bg-dark-card-nested rounded-lg border border-dark-border">
          <FiKey size={40} className="mx-auto text-gray-500 mb-4" />
          <h4 className="text-lg font-semibold mb-2">No LLM Integrations Found</h4>
          <p className="text-gray-400 mb-4">
            Connect your preferred Large Language Model providers to enable AI features.
          </p>
          <button
            onClick={handleAddIntegration}
            className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <FiPlusCircle className="inline mr-2 mb-0.5" /> Add Your First Integration
          </button>
        </div>
      )}

      {!isLoading && !error && integrations.length > 0 && (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.key_id}
              className="bg-dark-card-nested p-4 rounded-lg border border-dark-border flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center">
                {/* Placeholder for logo */}
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-4 flex-shrink-0">
                  {integration.provider_display_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{integration.provider_display_name}</p>
                  <p className="text-sm text-gray-400">
                    {integration.default_model ? `Default Model: ${integration.default_model}` : 'No default model set'}
                    <span className={`ml-3 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      integration.is_active ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {integration.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                 <button
                   onClick={() => handleEditIntegration(integration.key_id)}
                   className="p-2 text-gray-400 hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                   aria-label="Edit Integration"
                 >
                   <FiEdit size={18} />
                 </button>
                 <button
                   onClick={() => handleDeleteIntegration(integration.key_id)}
                   className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
                   aria-label="Delete Integration"
                 >
                   <FiTrash2 size={18} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EmailSettingsSection = () => (
  <div>
    <h3 className="text-2xl font-bold mb-6">Email Settings</h3>
    <p className="text-gray-400">Manage your connected email accounts and preferences.</p>
    {/* Email account management will go here */}
  </div>
);
