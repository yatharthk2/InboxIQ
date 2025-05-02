import React, { useState } from 'react';
import Button from '@/components/Button';
import { FiTag, FiPlusCircle, FiX, FiLoader } from 'react-icons/fi';

// Define Tag interface
interface Tag {
  name: string;
  color: string;
  priority: number;
}

// Suggested tag options without preselection - now with priority field
const SUGGESTED_TAGS: Tag[] = [
  { name: 'Work', color: '#4caf50', priority: 0 },
  { name: 'Personal', color: '#2196f3', priority: 1 },
  { name: 'Important', color: '#f44336', priority: 2 },
  { name: 'Finance', color: '#ff9800', priority: 3 },
  { name: 'Shopping', color: '#9c27b0', priority: 4 }
];

interface TagCreationStepProps {
  onComplete: (tags: Tag[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function TagCreationStep({ onComplete, onSkip, onBack }: TagCreationStepProps) {
  // Start with an empty selection instead of preselected tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6200ea');
  const [newTagPriority, setNewTagPriority] = useState(0);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleTagSelection = (tag: Tag) => {
    const exists = selectedTags.some(t => t.name === tag.name);
    
    if (exists) {
      setSelectedTags(selectedTags.filter(t => t.name !== tag.name));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addNewTag = () => {
    if (newTagName.trim()) {
      const newTag: Tag = {
        name: newTagName.trim(),
        color: newTagColor,
        priority: newTagPriority
      };
      
      setSelectedTags([...selectedTags, newTag]);
      setNewTagName('');
      setNewTagPriority(selectedTags.length); // Set priority to current tag count
      setIsCreatingTag(false);
    }
  };

  const handleComplete = async () => {
    if (selectedTags.length === 0) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Save tags to the database
      const response = await fetch('/api/tags/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ tags: selectedTags })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save tags');
      }

      const data = await response.json();
      
      // Call the original onComplete but with the tags including their database IDs
      onComplete(data.tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving tags');
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Create Email Tags</h2>
      <p className="text-gray-400 mb-6">
        Tags help you organize your emails and quickly identify different types of messages.
        Select from our suggested tags or create your own.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Your Selected Tags</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedTags.length > 0 ? (
            selectedTags.map((tag, index) => (
              <div 
                key={index}
                className="flex items-center bg-dark-bg rounded-full px-3 py-1 border border-dark-border"
              >
                <span 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: tag.color }}
                ></span>
                <span>{tag.name}</span>
                <button 
                  onClick={() => handleTagSelection(tag)}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No tags selected yet. Choose from the suggestions below or create your own.</p>
          )}
          
          <button
            onClick={() => setIsCreatingTag(true)}
            className="flex items-center bg-dark-bg rounded-full px-3 py-1 border border-dark-border text-primary hover:bg-dark-border transition"
          >
            <FiPlusCircle size={16} className="mr-1" />
            Add Tag
          </button>
        </div>
        
        {isCreatingTag && (
          <div className="p-4 bg-dark-bg rounded-md border border-dark-border mb-4">
            <h4 className="font-medium mb-2">Create New Tag</h4>
            <div className="flex flex-col gap-3 mb-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tag Name</label>
                <input 
                  type="text" 
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-dark-border rounded-md"
                  placeholder="Enter tag name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tag Color</label>
                <div className="flex items-center">
                  <input 
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-10 w-10 border-0 p-0 mr-3"
                  />
                  <div 
                    className="w-8 h-8 rounded-full mr-2"
                    style={{ backgroundColor: newTagColor }}
                  ></div>
                  <span>{newTagColor}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Priority (Lower number = Higher priority)</label>
                <input 
                  type="number" 
                  value={newTagPriority}
                  onChange={(e) => setNewTagPriority(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-black border border-dark-border rounded-md"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">Tags with lower priority numbers will show up first in lists</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={addNewTag}
                variant="primary"
                disabled={!newTagName.trim()}
              >
                Add Tag
              </Button>
              <Button 
                onClick={() => setIsCreatingTag(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {/* Suggested Tags Section */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Suggested Tags</h3>
          <p className="text-sm text-gray-400 mb-3">
            Click on any of these suggestions to add them to your selected tags.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagSelection(tag)}
                className={`flex items-center rounded-full px-3 py-1.5 transition-all ${
                  selectedTags.some(t => t.name === tag.name)
                    ? 'bg-primary/20 border border-primary/40'
                    : 'bg-dark-bg border border-dark-border hover:border-gray-500'
                }`}
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
      </div>
      
      <div className="flex gap-4">
        <Button 
          onClick={onBack}
          variant="outline"
          disabled={isSaving}
        >
          Back
        </Button>
        <Button 
          onClick={handleComplete}
          variant="primary"
          className="flex-1"
          disabled={selectedTags.length === 0 || isSaving}
        >
          {isSaving ? (
            <>
              <FiLoader className="animate-spin mr-2" />
              Saving Tags...
            </>
          ) : (
            selectedTags.length === 0 ? 'Please select at least one tag' : 'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
