import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac, Ctrl on Windows/Linux
    shift?: boolean;
    alt?: boolean;
  };
  description: string;
  action: () => void;
  enabled?: boolean; // Whether the shortcut is currently enabled
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (event.key === 'Escape') {
          // Continue to check shortcuts
        } else {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const modifiers = shortcut.modifiers || {};
        
        const ctrlMatches = modifiers.ctrl === undefined ? false : (event.ctrlKey === modifiers.ctrl);
        const metaMatches = modifiers.meta === undefined ? false : (event.metaKey === modifiers.meta);
        const shiftMatches = modifiers.shift === undefined ? false : (event.shiftKey === modifiers.shift);
        const altMatches = modifiers.alt === undefined ? false : (event.altKey === modifiers.alt);

        // Check if all specified modifiers match
        const allModifiersMatch = 
          (modifiers.ctrl === undefined || ctrlMatches) &&
          (modifiers.meta === undefined || metaMatches) &&
          (modifiers.shift === undefined || shiftMatches) &&
          (modifiers.alt === undefined || altMatches);

        // Ensure no unexpected modifiers are pressed
        const noUnexpectedModifiers = 
          (modifiers.ctrl === undefined ? !event.ctrlKey : true) &&
          (modifiers.meta === undefined ? !event.metaKey : true) &&
          (modifiers.shift === undefined ? !event.shiftKey : true) &&
          (modifiers.alt === undefined ? !event.altKey : true);

        if (keyMatches && allModifiersMatch && noUnexpectedModifiers) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

// Helper to format shortcut for display
export function formatShortcut(shortcut: Omit<KeyboardShortcut, 'action' | 'enabled'>): string {
  const parts: string[] = [];
  
  // Detect platform
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  
  if (shortcut.modifiers?.meta) {
    parts.push(cmdKey);
  }
  if (shortcut.modifiers?.ctrl && !isMac) {
    parts.push('Ctrl');
  }
  if (shortcut.modifiers?.shift) {
    parts.push('⇧');
  }
  if (shortcut.modifiers?.alt) {
    parts.push('⌥');
  }
  
  // Format the key
  let key = shortcut.key;
  if (key === 'ArrowDown') key = '↓';
  else if (key === 'ArrowUp') key = '↑';
  else if (key === 'ArrowLeft') key = '←';
  else if (key === 'ArrowRight') key = '→';
  else if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  
  return parts.join(' + ');
}

