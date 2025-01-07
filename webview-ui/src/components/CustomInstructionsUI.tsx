import React, { useState } from 'react';
import { useExtensionState } from '../context/ExtensionStateContext';
import { CustomInstruction } from '../../../../src/services/CustomInstructionsService';

export const CustomInstructionsUI: React.FC = () => {
  const { customInstructions, setCustomInstructions } = useExtensionState();
  const [newInstruction, setNewInstruction] = useState<Omit<CustomInstruction, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    content: '',
    isActive: true
  });

  const handleAddInstruction = () => {
    if (newInstruction.title && newInstruction.content) {
      const instruction: CustomInstruction = {
        ...newInstruction,
        id: `instruction-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setCustomInstructions([...customInstructions, instruction]);
      
      // Reset form
      setNewInstruction({
        title: '',
        content: '',
        isActive: true
      });
    }
  };

  const handleDeleteInstruction = (id: string) => {
    const updatedInstructions = customInstructions.filter(instruction => instruction.id !== id);
    setCustomInstructions(updatedInstructions);
  };

  const handleToggleActive = (id: string) => {
    const updatedInstructions = customInstructions.map(instruction => 
      instruction.id === id 
        ? { ...instruction, isActive: !instruction.isActive } 
        : instruction
    );
    setCustomInstructions(updatedInstructions);
  };

  return (
    <div className="custom-instructions">
      <h2>Custom Instructions</h2>
      
      <div className="new-instruction-form">
        <input 
          type="text"
          placeholder="Instruction Title"
          value={newInstruction.title}
          onChange={(e) => setNewInstruction(prev => ({ ...prev, title: e.target.value }))}
        />
        <textarea 
          placeholder="Instruction Content"
          value={newInstruction.content}
          onChange={(e) => setNewInstruction(prev => ({ ...prev, content: e.target.value }))}
        />
        <button onClick={handleAddInstruction}>Add Instruction</button>
      </div>

      <div className="instruction-list">
        {customInstructions.map(instruction => (
          <div key={instruction.id} className="instruction-item">
            <h3>{instruction.title}</h3>
            <p>{instruction.content}</p>
            <div className="instruction-actions">
              <button 
                onClick={() => handleToggleActive(instruction.id)}
                className={instruction.isActive ? 'active' : 'inactive'}
              >
                {instruction.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleDeleteInstruction(instruction.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 