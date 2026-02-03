"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, SaveIcon } from "lucide-react";

export function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("meta-llama/llama-3.1-8b-instruct:free");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["openRouterApiKey", "aiModel"], (result: { openRouterApiKey?: string; aiModel?: string }) => {
      if (result.openRouterApiKey) setApiKey(result.openRouterApiKey);
      if (result.aiModel) setModel(result.aiModel);
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ openRouterApiKey: apiKey, aiModel: model }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <KeyRound className="size-5" />
          AI Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-400 mb-1">
              OpenRouter API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-or-..."
            />
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-zinc-400 mb-1">
              Model
            </label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="qwen/qwen-2.5-vl-7b-instruct:free"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Find models at{" "}
              <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                openrouter.ai/models
              </a>
            </p>
          </div>

          <Button onClick={handleSave} className="w-full mt-4">
            <SaveIcon className="size-4 mr-2" />
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
