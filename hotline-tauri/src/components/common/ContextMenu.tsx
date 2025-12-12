import { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label?: string;
  icon?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose?: () => void;
}

export default function ContextMenu({ items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Filter out divider-only items and group items
  const visibleItems = items.filter((item, index) => {
    if (item.divider && index === 0) return false; // Don't show divider at start
    return true;
  });

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
    >
      {visibleItems.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="my-1 border-t border-gray-200 dark:border-gray-700"
            />
          );
        }

        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled && item.action) {
                item.action();
                onClose?.();
              }
            }}
            disabled={item.disabled}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const showContextMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate position, ensuring menu stays within viewport
    const menuWidth = 200;
    const menuHeight = 300;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight);
    
    setContextMenu({ x, y, items });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}

// ContextMenu component that uses the hook's state
export function ContextMenuRenderer({ contextMenu, onClose }: { contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null; onClose: () => void }) {
  if (!contextMenu) return null;

  return (
    <ContextMenu
      items={contextMenu.items}
      onClose={onClose}
    />
  );
}

