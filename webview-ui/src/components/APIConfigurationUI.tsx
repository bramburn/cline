import React, { useState } from 'react';
import { useExtensionState } from '../context/ExtensionStateContext';
import { APIConfiguration, ModelCapabilities } from '../../../../src/services/APIConfigurationService';

export const APIConfigurationUI: React.FC = () => {
  const { apiConfiguration, setApiConfiguration } = useExtensionState();
  const [localConfig, setLocalConfig] = useState<APIConfiguration>(apiConfiguration);

  const handleModelChange = (model: string) => {
    setLocalConfig(prev => ({
      ...prev,
      selectedModel: model
    }));
  };

  const handleAPIKeyChange = (apiKey: string) => {
    setLocalConfig(prev => ({
      ...prev,
      apiKey
    }));
  };

  const handleSave = () => {
    setApiConfiguration(localConfig);
  };

  const renderModelCapabilities = (model: ModelCapabilities) => (
    <div key={model.name} className="model-capabilities">
      <h3>{model.name}</h3>
      <p>Context Window: {model.contextWindow} tokens</p>
      <p>Streaming: {model.supportsStreaming ? 'Supported' : 'Not Supported'}</p>
      <p>Features: {model.supportedFeatures.join(', ')}</p>
    </div>
  );

  return (
    <div className="api-configuration">
      <h2>API Configuration</h2>
      
      <div className="model-selection">
        <label htmlFor="model-select">Select Model:</label>
        <select 
          id="model-select"
          value={localConfig.selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
        >
          {localConfig.models.map(model => (
            <option key={model.name} value={model.name}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      <div className="api-key-input">
        <label htmlFor="api-key">API Key:</label>
        <input 
          type="password"
          id="api-key"
          value={localConfig.apiKey || ''}
          onChange={(e) => handleAPIKeyChange(e.target.value)}
          placeholder="Enter your API key"
        />
      </div>

      <div className="model-capabilities-list">
        <h3>Model Capabilities</h3>
        {localConfig.models.map(renderModelCapabilities)}
      </div>

      <button onClick={handleSave}>Save Configuration</button>
    </div>
  );
}; 