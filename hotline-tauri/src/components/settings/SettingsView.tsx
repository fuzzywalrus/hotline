import { useState } from 'react';
import GeneralSettingsTab from './GeneralSettingsTab';
import IconSettingsTab from './IconSettingsTab';
import SoundSettingsTab from './SoundSettingsTab';
import KeyboardShortcutsTab from './KeyboardShortcutsTab';
import AboutSettingsTab from './AboutSettingsTab';
import UpdateSettingsTab from './UpdateSettingsTab';

type SettingsTab = 'general' | 'icon' | 'sound' | 'shortcuts' | 'about' | 'updates';

interface SettingsViewProps {
  onClose: () => void;
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('icon')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'icon'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Icon
          </button>
          <button
            onClick={() => setActiveTab('sound')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sound'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Sound
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'shortcuts'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Shortcuts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'updates'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Updates
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'general' && <GeneralSettingsTab />}
          {activeTab === 'icon' && <IconSettingsTab />}
          {activeTab === 'sound' && <SoundSettingsTab />}
          {activeTab === 'shortcuts' && <KeyboardShortcutsTab />}
          {activeTab === 'about' && <AboutSettingsTab />}
          {activeTab === 'updates' && <UpdateSettingsTab />}
        </div>
      </div>
    </div>
  );
}

