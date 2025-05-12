import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiPlus, FiCheck, FiX, FiTrash2, FiEdit, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import providerData from '../data/wildcard.json';

// Define types
type LlmIntegration = {
  key_id: number;
  provider_id: number;
  is_active: boolean;
  default_model: string | null;
  last_used: string | null;
  provider_name: string;
  provider_display_name: string;
  provider_logo_url: string | null;
};

type UserTag = {
  id: number;
  name: string;
  color: string;
  priority: number;
};

type EmailIntegration = {
  id: number;
  email_address: string;
  provider_type: string;
  last_sync: string | null;
  tag?: UserTag | null; // Changed from tags: UserTag[] to tag?: UserTag | null
};

type Provider = {
  id: string;
  name: string;
  logo: string;
  description: string;
  models: Model[];
};

type Model = {
  id: string;
  name: string;
  description: string;
  context_length: number;
};

type IntegrationFormData = {
  providerId: string;
  providerName: string;
  apiKey: string;
  defaultModel: string;
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [integrations, setIntegrations] = useState<LlmIntegration[]>([]);
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailLoading, setIsEmailLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<IntegrationFormData>({
    providerId: '',
    providerName: '',
    apiKey: '',
    defaultModel: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [customProvider, setCustomProvider] = useState({
    id: '',
    name: ''
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<LlmIntegration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState('llm-integrations'); // Track active section
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [emailConnectError, setEmailConnectError] = useState('');
  const [showDeleteEmailConfirm, setShowDeleteEmailConfirm] = useState<number | null>(null);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [emailDeleteError, setEmailDeleteError] = useState('');

  // State for managing tags for email accounts
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [managingTagsForAccount, setManagingTagsForAccount] = useState<EmailIntegration | null>(null);
  const [selectedTagToAdd, setSelectedTagToAdd] = useState<string>(''); // Store tag ID as string for select
  const [isUpdatingAccountTags, setIsUpdatingAccountTags] = useState(false);
  const [tagManagementError, setTagManagementError] = useState('');
  // New state for custom tag creation
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#000000');


  // Handle sidebar navigation clicks
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    // Close the add form when switching sections
    if (showAddForm) {
      setShowAddForm(false);
      resetForm();
    }
  };

  // Check auth status on mount and load providers
  useEffect(() => {
    // Load providers from wildcard.json
    setProviders(providerData.providers);

    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    
    if (!storedUser || !token) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchIntegrations(parsedUser.id, token);
      fetchEmailIntegrations(parsedUser.id, token);
      fetchUserTags(parsedUser.id, token); // Fetch user tags
    }
  }, [router]);

  // Update form data when a provider is selected
  useEffect(() => {
    if (selectedProvider) {
      setFormData(prev => ({
        ...prev,
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        defaultModel: selectedProvider.models.length > 0 ? selectedProvider.models[0].id : ''
      }));
    }
  }, [selectedProvider]);

  const fetchIntegrations = async (userId: string, token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/llm/integrations?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }
      
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserTags = async (userId: string, token: string) => {
    try {
      // This would be an API call, e.g., GET /api/user-tags?userId=${userId}
      // For now, let's assume it's fetched and set.
      // Replace with actual API call:
      const response = await fetch(`/api/user-tags?userId=${userId}`, { // Assuming this API endpoint exists
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user tags');
      }
      const data = await response.json();
      setUserTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching user tags:', error);
      // Handle error appropriately
    }
  };

  const fetchEmailIntegrations = async (userId: string, token: string) => {
    try {
      setIsEmailLoading(true);
      const response = await fetch(`/api/email/integrations?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch email integrations');
      }
      
      const data = await response.json();
      // The backend for /api/email/integrations should now return 'tags' array for each integration.
      // Example structure for each item in data.integrations:
      // { id: 1, email_address: "...", ..., tags: [{id: 1, name: "Important", color: "#ff0000", priority: 1}] }
      setEmailIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching email integrations:', error);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    
    if (provider.id === 'custom') {
      setCustomProvider({
        id: '',
        name: ''
      });
    }
  };

  const handleCustomProviderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomProvider(prev => ({ ...prev, [name]: value }));
    
    // Update the form data as well
    if (name === 'id') {
      setFormData(prev => ({ ...prev, providerId: value }));
    } else if (name === 'name') {
      setFormData(prev => ({ ...prev, providerName: value }));
    }
  };

  const handleModelSelect = (modelId: string) => {
    setFormData(prev => ({ ...prev, defaultModel: modelId }));
    setShowModelDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      providerId: '',
      providerName: '',
      apiKey: '',
      defaultModel: '',
    });
    setSelectedProvider(null);
    setCustomProvider({ id: '', name: '' });
    setFormError('');
    setFormSuccess('');
    setIsEditing(false);
    setEditingIntegration(null);
  };

  const handleEditIntegration = (integration: LlmIntegration) => {
    setEditingIntegration(integration);
    setIsEditing(true);
    
    // Find matching provider from our list
    const matchingProvider = providers.find(p => p.id.toLowerCase() === integration.provider_name.toLowerCase());
    
    if (matchingProvider) {
      setSelectedProvider(matchingProvider);
    } else {
      // If no matching provider, use custom provider
      const customProviderTemplate = providers.find(p => p.id === 'custom');
      setSelectedProvider(customProviderTemplate || null);
      setCustomProvider({
        id: integration.provider_name,
        name: integration.provider_display_name
      });
    }
    
    setFormData({
      providerId: integration.provider_name,
      providerName: integration.provider_display_name,
      apiKey: '', // We don't get the actual API key for security reasons
      defaultModel: integration.default_model || ''
    });
    
    setShowAddForm(true);
  };

  const handleDeleteIntegration = async (keyId: number) => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken') || '';
      
      const response = await fetch(`/api/llm/delete-api-key?keyId=${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete integration');
      }
      
      // Remove the deleted integration from the state
      setIntegrations(prev => prev.filter(integration => integration.key_id !== keyId));
      setShowDeleteConfirm(null);
      
    } catch (error: any) {
      console.error('Error deleting integration:', error);
      alert(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to delete/disconnect an email account
  const handleDeleteEmailAccount = async (accountId: number) => {
    if (!user) return;
    
    setIsDeletingEmail(true);
    setEmailDeleteError('');
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/email/delete-account?accountId=${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disconnect email account');
      }
      
      // Remove the disconnected account from the state
      setEmailIntegrations(prev => prev.filter(integration => integration.id !== accountId));
      setShowDeleteEmailConfirm(null);
      
    } catch (error: any) {
      console.error('Error disconnecting email account:', error);
      setEmailDeleteError(error.message || 'Failed to disconnect email account');
    } finally {
      setIsDeletingEmail(false);
    }
  };

  // Tag Management Modal Handlers
  const openManageTagsModal = (account: EmailIntegration) => {
    setManagingTagsForAccount(account);
    setSelectedTagToAdd('');
    setTagManagementError('');
  };

  const closeManageTagsModal = () => {
    setManagingTagsForAccount(null);
    setNewTagName('');
    setNewTagColor('#000000');
    setTagManagementError('');
  };

  const handleAddTagToAccount = async (tagIdToAdd?: number) => {
    if (!managingTagsForAccount || (!selectedTagToAdd && !tagIdToAdd)) return;

    const finalTagId = tagIdToAdd || parseInt(selectedTagToAdd);
    if (isNaN(finalTagId)) {
      setTagManagementError('Invalid tag selected.');
      return;
    }
    // Prevent re-assigning the same tag if it's already the current tag
    if (managingTagsForAccount.tag && managingTagsForAccount.tag.id === finalTagId && !tagIdToAdd) { // !tagIdToAdd ensures this check is for selection, not creation flow
        setTagManagementError('This tag is already assigned to the account.');
        return;
    }


    setIsUpdatingAccountTags(true);
    setTagManagementError('');
    const token = localStorage.getItem('authToken');

    try {
      // POST to /api/email/accounts/[accountId]/tags to set/replace the tag
      const response = await fetch(`/api/email/accounts/${managingTagsForAccount.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tagId: finalTagId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set tag');
      }
      
      if (user && token) {
        await fetchEmailIntegrations(user.id, token); 
        // Update managingTagsForAccount with fresh data
        const updatedEmailIntegrations = await (await fetch(`/api/email/integrations?userId=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
        const currentAccountData = updatedEmailIntegrations.integrations.find((acc: EmailIntegration) => acc.id === managingTagsForAccount.id);
        if (currentAccountData) {
          setManagingTagsForAccount(currentAccountData);
        } else {
          // Account might have been deleted in another session, close modal
          closeManageTagsModal();
        }
      }
      setSelectedTagToAdd('');
    } catch (error: any) {
      setTagManagementError(error.message || 'Error setting tag.');
    } finally {
      setIsUpdatingAccountTags(false);
    }
  };

  const handleCreateAndAddTagToAccount = async () => {
    if (!managingTagsForAccount || !newTagName.trim()) {
      setTagManagementError('New tag name cannot be empty.');
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(newTagColor)) {
      setTagManagementError('Invalid color format. Use #RRGGBB.');
      return;
    }

    setIsUpdatingAccountTags(true);
    setTagManagementError('');
    const token = localStorage.getItem('authToken');

    try {
      // 1. Create the new tag
      const createTagResponse = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor, priority: 0 }) // Default priority
      });

      if (!createTagResponse.ok) {
        const errorData = await createTagResponse.json();
        throw new Error(errorData.message || 'Failed to create tag');
      }

      const { tag: newTag } = await createTagResponse.json();
      if (!newTag || !newTag.id) {
        throw new Error('Failed to get new tag details after creation.');
      }

      // 2. Refresh user tags list
      if (user && token) {
        await fetchUserTags(user.id, token);
      }

      // 3. Add the new tag to the account (using its ID)
      await handleAddTagToAccount(newTag.id); // Re-use existing logic to set/replace

      setNewTagName('');
      setNewTagColor('#000000');
      // The success message/UI update for adding to account is handled by handleAddTagToAccount

    } catch (error: any) {
      setTagManagementError(error.message || 'Error creating and adding tag.');
    } finally {
      setIsUpdatingAccountTags(false);
    }
  };


  const handleRemoveTagFromAccount = async () => { 
    if (!managingTagsForAccount || !managingTagsForAccount.tag) {
      setTagManagementError('No tag is currently assigned to this account or account not found.');
      return;
    }

    const tagIdToRemove = managingTagsForAccount.tag.id;

    setIsUpdatingAccountTags(true);
    setTagManagementError('');
    const token = localStorage.getItem('authToken');

    try {
      // DELETE to /api/email/accounts/[accountId]/tags/[tagId] to remove the specific tag
      const response = await fetch(`/api/email/accounts/${managingTagsForAccount.id}/tags/${tagIdToRemove}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove tag');
      }

      if (user && token) {
        await fetchEmailIntegrations(user.id, token);
         // Update managingTagsForAccount with fresh data
        const updatedEmailIntegrations = await (await fetch(`/api/email/integrations?userId=${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
        const currentAccountData = updatedEmailIntegrations.integrations.find((acc: EmailIntegration) => acc.id === managingTagsForAccount.id);
        if (currentAccountData) {
          setManagingTagsForAccount(currentAccountData);
        } else {
          closeManageTagsModal();
        }
      }
    } catch (error: any) {
      setTagManagementError(error.message || 'Error removing tag.');
    } finally {
      setIsUpdatingAccountTags(false);
    }
  };


  const saveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    // Validate form data
    if (!formData.providerId.trim()) {
      setFormError('Provider ID is required');
      return;
    }
    
    if (!formData.apiKey.trim() && !isEditing) {
      setFormError('API key is required');
      return;
    }
    
    // If using custom provider, ensure name is provided
    if (selectedProvider?.id === 'custom' && !customProvider.name.trim()) {
      setFormError('Provider name is required for custom providers');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken') || '';
      
      // Use custom provider details if that's selected
      const finalProviderId = selectedProvider?.id === 'custom' ? customProvider.id : formData.providerId;
      const finalProviderName = selectedProvider?.id === 'custom' ? customProvider.name : formData.providerName;
      
      const requestBody: any = {
        providerId: finalProviderId,
        providerName: finalProviderName,
        defaultModel: formData.defaultModel || null
      };
      
      // Only include API key if it's provided (might be empty when editing)
      if (formData.apiKey.trim()) {
        requestBody.apiKey = formData.apiKey;
      }
      
      // If editing, include the key ID
      if (isEditing && editingIntegration) {
        requestBody.keyId = editingIntegration.key_id;
      }
      
      const response = await fetch('/api/llm/save-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save integration');
      }
      
      const data = await response.json();
      setFormSuccess(isEditing ? 'Integration updated successfully!' : 'Integration saved successfully!');
      
      // Reset form
      resetForm();
      
      // Refresh integrations list
      if (user) {
        fetchIntegrations(user.id, token);
      }
      
      // Close form after a short delay
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error saving integration:', error);
      setFormError(error.message || 'Failed to save integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedModelName = () => {
    if (!selectedProvider || !formData.defaultModel) return 'Select a model';
    
    const model = selectedProvider.models.find(m => m.id === formData.defaultModel);
    return model ? model.name : formData.defaultModel;
  };

  // Function to initiate Gmail connection
  const connectGmail = async () => {
    if (!user) return;
    
    setIsConnectingEmail(true);
    setEmailConnectError('');
    
    try {
      // Get the auth URL from the API
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/gmail-auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get authentication URL');
      }
      
      const { authUrl } = await response.json();
      
      // Open a popup window for the OAuth flow
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'gmail-auth-popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Function to handle messages from the popup
      const handleMessage = (event: MessageEvent) => {
        // Only process messages from our popup
        if (popup && event.source === popup) {
          const { type, email, error } = event.data;
          
          if (type === 'GMAIL_CONNECTED' && email) {
            // Successfully connected Gmail account
            console.log('Gmail connected:', email);
            
            // Refresh email integrations
            if (user) {
              fetchEmailIntegrations(user.id, token || '');
            }
            
            // Clean up
            window.removeEventListener('message', handleMessage);
          } else if (type === 'GMAIL_CONNECTION_FAILED' && error) {
            // Failed to connect Gmail account
            console.error('Gmail connection failed:', error);
            setEmailConnectError(`Failed to connect: ${error}`);
            
            // Clean up
            window.removeEventListener('message', handleMessage);
          }
        }
      };
      
      // Listen for messages from the popup
      window.addEventListener('message', handleMessage);
      
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      setEmailConnectError(error.message || 'Failed to connect Gmail account');
    } finally {
      setIsConnectingEmail(false);
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
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="p-4 border-b border-dark-border bg-dark-card/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/home" passHref legacyBehavior>
              <a className="flex items-center text-gray-400 hover:text-white mr-4">
                <FiArrowLeft className="mr-2" />
                Back to Chat
              </a>
            </Link>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="ml-2">{user.email}</span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-dark-card/80 rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-3">Settings</h2>
              <nav className="space-y-1.5">
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleSectionChange('account'); }}
                  className={`block p-2 rounded hover:bg-dark-bg ${activeSection === 'account' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Account
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleSectionChange('llm-integrations'); }}
                  className={`block p-2 rounded hover:bg-dark-bg ${activeSection === 'llm-integrations' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  LLM integrations
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleSectionChange('email-integration'); }}
                  className={`block p-2 rounded hover:bg-dark-bg ${activeSection === 'email-integration' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Email integration
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); handleSectionChange('preferences'); }}
                  className={`block p-2 rounded hover:bg-dark-bg ${activeSection === 'preferences' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Preferences
                </a>
              </nav>
            </div>
          </div>
          
          {/* Main settings area */}
          <div className="md:col-span-3">
            {/* LLM Integrations Section */}
            {activeSection === 'llm-integrations' && (
              <section className="bg-dark-card/80 rounded-lg p-4 shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">LLM Integrations</h2>
                  {!showAddForm && (
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition"
                    >
                      <FiPlus className="mr-1" /> Add Integration
                    </button>
                  )}
                </div>
                
                {/* Add/Edit integration form */}
                {showAddForm && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-dark-bg rounded-lg p-4 mb-6 border border-dark-border"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">
                        {isEditing ? 'Edit Integration' : 'Add LLM Integration'}
                      </h3>
                      <button 
                        onClick={() => {
                          setShowAddForm(false);
                          resetForm();
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <FiX />
                      </button>
                    </div>
                    
                    <form onSubmit={saveIntegration} className="space-y-4">
                      {/* Provider Selection */}
                      <div>
                        <label className="block text-sm mb-1">Provider</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {providers.map(provider => (
                            <div
                              key={provider.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                selectedProvider?.id === provider.id
                                  ? 'border-primary bg-primary/10'
                                  : 'border-dark-border hover:border-gray-500'
                              }`}
                              onClick={() => handleProviderSelect(provider)}
                            >
                              <div className="flex items-center mb-2">
                                <div className="w-8 h-8 bg-dark-card rounded flex items-center justify-center mr-2">
                                  {provider.logo ? (
                                    <img 
                                      src={provider.logo} 
                                      alt={provider.name} 
                                      className="w-6 h-6 object-contain"
                                      onError={(e) => {
                                        // If image fails to load, show first letter
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = provider.name.charAt(0);
                                      }}
                                    />
                                  ) : (
                                    <span>{provider.name.charAt(0)}</span>
                                  )}
                                </div>
                                <span className="font-medium">{provider.name}</span>
                              </div>
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {provider.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Custom Provider Fields (shown only when custom provider is selected) */}
                      {selectedProvider?.id === 'custom' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm mb-1">Provider ID</label>
                            <input
                              type="text"
                              name="id"
                              value={customProvider.id}
                              onChange={handleCustomProviderChange}
                              placeholder="e.g., perplexity, groq"
                              className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              required
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              A unique identifier for the provider (no spaces)
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm mb-1">Provider Name</label>
                            <input
                              type="text"
                              name="name"
                              value={customProvider.name}
                              onChange={handleCustomProviderChange}
                              placeholder="e.g., Perplexity AI, Groq"
                              className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              required
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Display name for the provider
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* API Key Field */}
                      <div>
                        <label className="block text-sm mb-1">
                          API Key {isEditing && <span className="text-gray-400">(Leave blank to keep existing key)</span>}
                        </label>
                        <input
                          type="password"
                          name="apiKey"
                          value={formData.apiKey}
                          onChange={handleInputChange}
                          placeholder={isEditing ? "Enter to update or leave blank to keep existing" : "Enter your API key"}
                          className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          required={!isEditing}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Your API key is securely stored and encrypted
                        </p>
                      </div>
                      
                      {/* Model Selection Dropdown (only shown when a provider with models is selected) */}
                      {selectedProvider && selectedProvider.id !== 'custom' && selectedProvider.models.length > 0 && (
                        <div>
                          <label className="block text-sm mb-1">Default Model</label>
                          <div className="relative">
                            <button
                              type="button"
                              className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              onClick={() => setShowModelDropdown(!showModelDropdown)}
                            >
                              <span>{getSelectedModelName()}</span>
                              <FiChevronDown className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showModelDropdown && (
                              <div className="absolute z-10 mt-1 w-full bg-dark-card border border-dark-border rounded-md shadow-lg max-h-60 overflow-auto">
                                {selectedProvider.models.map(model => (
                                  <div
                                    key={model.id}
                                    className="px-3 py-2 hover:bg-dark-bg cursor-pointer"
                                    onClick={() => handleModelSelect(model.id)}
                                  >
                                    <div className="font-medium">{model.name}</div>
                                    <div className="text-xs text-gray-400">{model.description}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            This model will be used by default when no model is specified
                          </p>
                        </div>
                      )}
                      
                      {/* Custom Model Field (for custom providers) */}
                      {selectedProvider?.id === 'custom' && (
                        <div>
                          <label className="block text-sm mb-1">Default Model (Optional)</label>
                          <input
                            type="text"
                            name="defaultModel"
                            value={formData.defaultModel}
                            onChange={handleInputChange}
                            placeholder="e.g., mixtral-8x7b, llama2-70b"
                            className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Specify the default model identifier for this provider
                          </p>
                        </div>
                      )}
                      
                      {/* Error and Success Messages */}
                      {formError && (
                        <div className="text-red-500 text-sm p-2 bg-red-500/10 rounded border border-red-500/20">
                          {formError}
                        </div>
                      )}
                      
                      {formSuccess && (
                        <div className="text-green-500 text-sm p-2 bg-green-500/10 rounded border border-green-500/20 flex items-center">
                          <FiCheck className="mr-2" /> {formSuccess}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            resetForm();
                          }}
                          className="px-4 py-2 border border-dark-border rounded-md hover:bg-dark-bg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !selectedProvider}
                          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              {isEditing ? 'Updating...' : 'Saving...'}
                            </>
                          ) : (
                            <>{isEditing ? 'Update Integration' : 'Save Integration'}</>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
                
                {/* Integrations list */}
                <div className="overflow-hidden rounded-lg border border-dark-border">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-400">Loading integrations...</p>
                    </div>
                  ) : integrations.length === 0 ? (
                    <div className="p-8 text-center bg-dark-bg">
                      <p className="text-gray-400 mb-4">No LLM integrations configured.</p>
                      {!showAddForm && (
                        <button 
                          onClick={() => setShowAddForm(true)}
                          className="bg-primary/10 text-primary px-4 py-2 rounded-md hover:bg-primary/20 transition inline-flex items-center"
                        >
                          <FiPlus className="mr-2" /> Add your first integration
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-dark-bg text-left">
                        <tr>
                          <th className="px-4 py-3">Provider</th>
                          <th className="px-4 py-3">Default Model</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {integrations.map((integration) => (
                          <tr key={integration.key_id} className="hover:bg-dark-bg/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                {integration.provider_logo_url ? (
                                  <img 
                                    src={integration.provider_logo_url} 
                                    alt={integration.provider_display_name} 
                                    className="w-6 h-6 mr-2 rounded"
                                    onError={(e) => {
                                      // If image fails to load, show first letter
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = integration.provider_display_name.charAt(0);
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-primary/20 text-primary rounded flex items-center justify-center mr-2 text-xs">
                                    {integration.provider_display_name.charAt(0)}
                                  </div>
                                )}
                                <span>{integration.provider_display_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {integration.default_model || <span className="text-gray-500">Not set</span>}
                            </td>
                            <td className="px-4 py-3">
                              {integration.is_active ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {showDeleteConfirm === integration.key_id ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-red-400">Confirm delete?</span>
                                  <button 
                                    className="text-red-500 hover:text-red-400"
                                    onClick={() => handleDeleteIntegration(integration.key_id)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? (
                                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <FiCheck size={16} />
                                    )}
                                  </button>
                                  <button 
                                    className="text-gray-400 hover:text-white"
                                    onClick={() => setShowDeleteConfirm(null)}
                                    disabled={isDeleting}
                                  >
                                    <FiX size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <button 
                                    className="text-gray-400 hover:text-white"
                                    title="Edit integration"
                                    onClick={() => handleEditIntegration(integration)}
                                  >
                                    <FiEdit size={18} />
                                  </button>
                                  <button 
                                    className="text-gray-400 hover:text-red-500"
                                    title="Delete integration"
                                    onClick={() => setShowDeleteConfirm(integration.key_id)}
                                  >
                                    <FiTrash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                
                <div className="mt-3 text-sm text-gray-400">
                  Your API keys are securely stored and encrypted. We never share your keys with third parties.
                </div>
              </section>
            )}
            
            {/* Email integration section */}
            {activeSection === 'email-integration' && (
              <section className="bg-dark-card/80 rounded-lg p-4 shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Email Integration</h2>
                  <button 
                    onClick={connectGmail}
                    disabled={isConnectingEmail}
                    className="flex items-center bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnectingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <FiPlus className="mr-1" /> Connect Email
                      </>
                    )}
                  </button>
                </div>
                
                {emailConnectError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                    <div className="flex items-center">
                      <FiAlertCircle className="mr-2 flex-shrink-0" />
                      {emailConnectError}
                    </div>
                  </div>
                )}
                
                {emailDeleteError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                    <div className="flex items-center">
                      <FiAlertCircle className="mr-2 flex-shrink-0" />
                      {emailDeleteError}
                    </div>
                  </div>
                )}
                
                <div className="overflow-hidden rounded-lg border border-dark-border">
                  {isEmailLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-gray-400">Loading email integrations...</p>
                    </div>
                  ) : emailIntegrations.length === 0 ? (
                    <div className="p-8 text-center bg-dark-bg">
                      <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={24} />
                      <p className="text-gray-400 mb-4">No email accounts connected yet.</p>
                      <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Connect your email accounts to receive notifications and manage messages directly from InboxIQ.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-dark-bg text-left">
                        <tr>
                          <th className="px-4 py-3">Email Address</th>
                          <th className="px-4 py-3">Provider</th>
                          <th className="px-4 py-3">Last Sync</th>
                          <th className="px-4 py-3">Tags</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {emailIntegrations.map((integration) => (
                          <tr key={integration.id} className="hover:bg-dark-bg/50">
                            <td className="px-4 py-3">{integration.email_address}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-primary/20 text-primary rounded flex items-center justify-center mr-2 text-xs">
                                  {integration.provider_type === 'gmail' ? 'G' : integration.provider_type.charAt(0).toUpperCase()}
                                </div>
                                <span>
                                  {integration.provider_type === 'gmail' 
                                    ? 'Gmail' 
                                    : integration.provider_type.charAt(0).toUpperCase() + integration.provider_type.slice(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {integration.last_sync 
                                ? new Date(integration.last_sync).toLocaleString() 
                                : <span className="text-gray-500">Never</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {integration.tag ? (
                                  <span 
                                    key={integration.tag.id} 
                                    className="px-2 py-0.5 text-xs rounded-full"
                                    style={{ backgroundColor: integration.tag.color, color: '#ffffff' }}
                                  >
                                    {integration.tag.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">No tag</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <button 
                                  className="text-gray-400 hover:text-white"
                                  title="Manage Tags"
                                  onClick={() => openManageTagsModal(integration)}
                                >
                                  <FiEdit size={18} /> {/* Placeholder, consider a tags icon */}
                                </button>
                                <button 
                                  className="text-gray-400 hover:text-red-500"
                                  title="Disconnect account"
                                  onClick={() => setShowDeleteEmailConfirm(integration.id)}
                                >
                                  <FiTrash2 size={18} />
                                </button>
                                
                                {showDeleteEmailConfirm === integration.id && (
                                  <div className="absolute bg-dark-card border border-dark-border rounded-md p-2 shadow-lg z-10 -ml-32">
                                    <p className="text-xs text-red-400 mb-2">Disconnect this account?</p>
                                    <div className="flex items-center space-x-2">
                                      <button 
                                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 border border-red-500/30 rounded"
                                        onClick={() => handleDeleteEmailAccount(integration.id)}
                                        disabled={isDeletingEmail}
                                      >
                                        {isDeletingEmail ? (
                                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          'Disconnect'
                                        )}
                                      </button>
                                      <button 
                                        className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-dark-border rounded"
                                        onClick={() => setShowDeleteEmailConfirm(null)}
                                        disabled={isDeletingEmail}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}
            
            {/* Account section - placeholder */}
            {activeSection === 'account' && (
              <section className="bg-dark-card/80 rounded-lg p-4 shadow mb-6">
                <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
                <div className="p-8 text-center bg-dark-bg rounded-lg border border-dark-border">
                  <p className="text-gray-400">Account settings will be available soon.</p>
                </div>
              </section>
            )}
            
            {/* Preferences section - placeholder */}
            {activeSection === 'preferences' && (
              <section className="bg-dark-card/80 rounded-lg p-4 shadow mb-6">
                <h2 className="text-lg font-semibold mb-4">Preferences</h2>
                <div className="p-8 text-center bg-dark-bg rounded-lg border border-dark-border">
                  <p className="text-gray-400">Preference settings will be available soon.</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Manage Tags Modal */}
      {managingTagsForAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-dark-card rounded-lg shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Tags for {managingTagsForAccount.email_address}</h3>
              <button onClick={closeManageTagsModal} className="text-gray-400 hover:text-white">
                <FiX size={20} />
              </button>
            </div>

            {tagManagementError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-sm">
                {tagManagementError}
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Current Tag:</h4>
              {managingTagsForAccount.tag ? (
                <div className="flex items-center justify-between p-2 bg-dark-bg rounded-md">
                    <span 
                        className="px-2 py-0.5 text-xs rounded-full" 
                        style={{ backgroundColor: managingTagsForAccount.tag.color, color: '#fff' }}
                    >
                      {managingTagsForAccount.tag.name}
                    </span>
                    <button 
                      onClick={() => handleRemoveTagFromAccount()} 
                      disabled={isUpdatingAccountTags}
                      className="ml-1.5 text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Remove this tag"
                    >
                      <FiTrash2 size={14} />
                    </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No tag assigned to this account.</p>
              )}
            </div>

            <div className="mb-4 border-t border-dark-border pt-4">
              <h4 className="text-sm font-medium mb-2">{managingTagsForAccount.tag ? 'Change Tag To:' : 'Set Tag:'}</h4>
              <div className="flex items-center gap-2">
                <select
                  id="tag-select"
                  value={selectedTagToAdd}
                  onChange={(e) => setSelectedTagToAdd(e.target.value)}
                  className="flex-grow bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isUpdatingAccountTags}
                >
                  <option value="">Select a tag</option>
                  {userTags
                    // Filter out the current tag if it's already selected for this account
                    // Also, filter out tags that are already in use by *other* accounts
                    .filter(ut => {
                        const isCurrentlyAssignedToThisAccount = managingTagsForAccount.tag?.id === ut.id;
                        if (isCurrentlyAssignedToThisAccount) return true; // Allow re-selecting/confirming the current tag
                        
                        // Check if this tag 'ut' is used by any email integration at all
                        const tagInUseByAnyAccount = emailIntegrations.some(ei => ei.tag?.id === ut.id);
                        return !tagInUseByAnyAccount; // Only show if not used by any account
                    })
                    .sort((a, b) => a.name.localeCompare(b.name)) 
                    .map(tag => (
                      <option key={tag.id} value={tag.id.toString()}>{tag.name} {managingTagsForAccount.tag?.id === tag.id ? "(Current)" : ""}</option>
                    ))}
                </select>
                <button
                  onClick={() => handleAddTagToAccount()}
                  disabled={!selectedTagToAdd || isUpdatingAccountTags || (managingTagsForAccount.tag?.id === parseInt(selectedTagToAdd))}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 shrink-0"
                >
                  {isUpdatingAccountTags && selectedTagToAdd ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (managingTagsForAccount.tag ? 'Change' : 'Set')}
                </button>
              </div>
            </div>

            <div className="mb-4 border-t border-dark-border pt-4">
              <h4 className="text-sm font-medium mb-2">Create & Set New Tag:</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="New Tag Name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isUpdatingAccountTags}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-10 w-10 p-0 border-none rounded bg-black/30 cursor-pointer"
                    disabled={isUpdatingAccountTags}
                    title="Select tag color"
                  />
                  <input
                    type="text"
                    placeholder="Hex Color (e.g. #RRGGBB)"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="flex-grow bg-black/30 border border-dark-border rounded py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isUpdatingAccountTags}
                  />
                </div>
                <button
                  onClick={handleCreateAndAddTagToAccount}
                  disabled={!newTagName.trim() || isUpdatingAccountTags}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isUpdatingAccountTags && !selectedTagToAdd ? ( // Show spinner if this section is active
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating & Setting...
                    </>
                  ) : 'Create & Set Tag'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={closeManageTagsModal}
                className="px-4 py-2 border border-dark-border rounded-md hover:bg-dark-bg"
                disabled={isUpdatingAccountTags}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
