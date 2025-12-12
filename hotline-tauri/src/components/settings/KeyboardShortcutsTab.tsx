import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

interface ShortcutInfo {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  description: string;
  category: string;
}

const shortcuts: ShortcutInfo[] = [
  // General
  {
    key: 'K',
    modifiers: { meta: true },
    description: 'Connect to Server',
    category: 'General',
  },
  {
    key: 'Escape',
    description: 'Close dialog / Cancel',
    category: 'General',
  },
  
  // Server Navigation
  {
    key: '1',
    modifiers: { meta: true },
    description: 'Switch to Chat tab',
    category: 'Server',
  },
  {
    key: '2',
    modifiers: { meta: true },
    description: 'Switch to Board tab',
    category: 'Server',
  },
  {
    key: '3',
    modifiers: { meta: true },
    description: 'Switch to News tab',
    category: 'Server',
  },
  {
    key: '4',
    modifiers: { meta: true },
    description: 'Switch to Files tab',
    category: 'Server',
  },
  {
    key: 'ArrowDown',
    modifiers: { meta: true },
    description: 'Connect to selected server',
    category: 'Server',
  },
  {
    key: 'B',
    modifiers: { meta: true },
    description: 'Broadcast Message',
    category: 'Server',
  },
  
  // File Navigation
  {
    key: 'ArrowRight',
    description: 'Navigate into folder / Forward',
    category: 'Files',
  },
  {
    key: 'ArrowLeft',
    description: 'Navigate back / Up one level',
    category: 'Files',
  },
  {
    key: ' ',
    description: 'Preview selected file',
    category: 'Files',
  },
  
  // Search
  {
    key: 'F',
    modifiers: { meta: true },
    description: 'Focus search / Open search',
    category: 'Search',
  },
  
  // Windows
  {
    key: 'T',
    modifiers: { meta: true, shift: true },
    description: 'Open Transfers window',
    category: 'Windows',
  },
];

export default function KeyboardShortcutsTab() {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Keyboard shortcuts for quick navigation and actions. Shortcuts work globally when not typing in text fields.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category} className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {category}
          </h3>
          <div className="space-y-2">
            {shortcuts
              .filter((s) => s.category === category)
              .map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                    {formatShortcut(shortcut)}
                  </kbd>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

