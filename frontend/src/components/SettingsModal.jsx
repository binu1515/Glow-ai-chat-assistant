import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Sliders, CheckCircle2, ShieldCheck, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { updateConfig } from '../services/api';

export default function SettingsModal({ isOpen, onClose, configData, onConfigUpdated }) {
  if (!isOpen) return null;

  const [activeProvider, setActiveProvider] = useState(configData?.active_config?.provider || 'gemini');
  const [activeModel, setActiveModel] = useState(configData?.active_config?.model || 'gemini-1.5-flash');
  const [temperature, setTemperature] = useState(configData?.active_config?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(configData?.active_config?.max_tokens ?? 2048);
  const [memoryWindow, setMemoryWindow] = useState(configData?.active_config?.memory_window ?? 10);
  const [systemPrompt, setSystemPrompt] = useState(
    configData?.active_config?.system_prompt || 'You are a helpful, accurate AI assistant with access to tools via Model Context Protocol.'
  );

  // API Key state for each provider
  const [apiKeys, setApiKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // When active provider changes, update default model for that provider
  const currentProviderObj = configData?.providers?.find((p) => p.id === activeProvider);
  const availableModels = currentProviderObj?.models || [];

  const handleProviderChange = (e) => {
    const newProv = e.target.value;
    setActiveProvider(newProv);
    const provObj = configData?.providers?.find((p) => p.id === newProv);
    if (provObj?.models?.length > 0) {
      setActiveModel(provObj.models[0].id);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        provider: activeProvider,
        model: activeModel,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens, 10),
        memory_window: parseInt(memoryWindow, 10),
        system_prompt: systemPrompt,
      };

      // Only send non-empty API keys
      const keysToSend = {};
      Object.keys(apiKeys).forEach((k) => {
        if (apiKeys[k]?.trim()) {
          keysToSend[k] = apiKeys[k].trim();
        }
      });

      if (Object.keys(keysToSend).length > 0) {
        payload.api_keys = keysToSend;
      }

      const updated = await updateConfig(payload);
      onConfigUpdated(updated);
      setSaveSuccess(true);
      // Clear input fields for security
      setApiKeys({});
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white">Configurable AI Model Settings</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-xs text-slate-300">
          {errorMessage && (
            <div className="rounded-lg border border-rose-800/80 bg-rose-950/40 p-3 text-rose-300">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-800/80 bg-emerald-950/40 p-3 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Model configuration and encrypted credentials updated successfully!</span>
            </div>
          )}

          {/* Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-200 mb-1.5">LLM Provider</label>
              <select
                value={activeProvider}
                onChange={handleProviderChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                {configData?.providers?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.has_api_key ? '✓ (Key Configured)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-200 mb-1.5">Model</label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.input_cost_per_million}/1M in, ${m.output_cost_per_million}/1M out)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Parameters: Temperature and Max Tokens */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
            <div className="flex items-center justify-between text-slate-200 font-medium">
              <span className="flex items-center space-x-1.5">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>Hyperparameters & History Buffer</span>
              </span>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Temperature (Creativity)</span>
                <span className="font-mono text-purple-400 font-bold">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Strict / Deterministic)</span>
                <span>1.0 (Balanced)</span>
                <span>2.0 (High Variety)</span>
              </div>
            </div>

            {/* Max Output Tokens Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Maximum Output Tokens</span>
                <span className="font-mono text-blue-400 font-bold">{maxTokens} tokens</span>
              </div>
              <input
                type="range"
                min="128"
                max="8192"
                step="128"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Memory Window Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Sliding Memory Window (Previous Messages Kept in Context)</span>
                <span className="font-mono text-emerald-400 font-bold">{memoryWindow} messages</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="2"
                value={memoryWindow}
                onChange={(e) => setMemoryWindow(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Secure API Keys Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-200 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Encrypted API Key Vault</span>
              </div>
              <span className="text-[10px] text-slate-400">Keys encrypted at rest (AES-256)</span>
            </div>

            <p className="text-[11px] text-slate-400">
              API keys are masked and securely stored in encrypted storage. You can switch models immediately without restarting.
            </p>

            {configData?.providers?.map((prov) => {
              const isShow = showKeys[prov.id];
              return (
                <div key={prov.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-300">{prov.name} API Key</span>
                    {prov.has_api_key && (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Configured: {prov.masked_key}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={isShow ? 'text' : 'password'}
                      placeholder={prov.has_api_key ? '•••••••• (Enter new key to update)' : `Enter ${prov.name} API key`}
                      value={apiKeys[prov.id] || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, [prov.id]: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, [prov.id]: !isShow })}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      {isShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* System Prompt Customization */}
          <div>
            <label className="block font-medium text-slate-200 mb-1.5">System Prompt / Agent Persona</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-blue-500"
              placeholder="Define instructions for the agent..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-800 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Configurations</span>
          </button>
        </div>
      </div>
    </div>
  );
}

