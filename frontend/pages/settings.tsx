import React, { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
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
                    className="flex items-center bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition"
                  >
                    <FiPlus className="mr-1" /> Connect Email
                  </button>
                </div>
                
                <div className="p-8 text-center bg-dark-bg rounded-lg border border-dark-border">
                  <FiAlertCircle className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-gray-400 mb-4">No email accounts connected yet.</p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Connect your email accounts to receive notifications and manage messages directly from InboxIQ.
                  </p>
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
    </div>
  );
}
