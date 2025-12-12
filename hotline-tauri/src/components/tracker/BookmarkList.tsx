import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import type { Bookmark, ServerBookmark } from '../../types';
import EditBookmarkDialog from './EditBookmarkDialog';

interface BookmarkListProps {
  bookmarks: Bookmark[];
}

export default function BookmarkList({ bookmarks }: BookmarkListProps) {
  const { removeBookmark, addActiveServer, setFocusedServer } = useAppStore();
  const { username, userIconId } = usePreferencesStore();
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectionErrors, setConnectionErrors] = useState<Map<string, string>>(new Map());
  const [expandedTrackers, setExpandedTrackers] = useState<Set<string>>(new Set());
  const [trackerServers, setTrackerServers] = useState<Map<string, ServerBookmark[]>>(new Map());
  const [loadingTrackers, setLoadingTrackers] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_bookmark', { id });
      removeBookmark(id);
      setDeletingId(null);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const handleConnect = async (bookmark: Bookmark) => {
    // Don't connect to trackers - they should be expanded instead
    // Check both explicit type and port (trackers use port 5498)
    if (bookmark.type === 'tracker' || bookmark.port === 5498) {
      console.log('Tracker detected, expanding instead of connecting:', bookmark.name);
      handleToggleTracker(bookmark.id);
      return;
    }

    setConnectingId(bookmark.id);
    // Clear any previous error for this bookmark
    setConnectionErrors((prev) => {
      const next = new Map(prev);
      next.delete(bookmark.id);
      return next;
    });

    try {
      const serverId = await invoke<string>('connect_to_server', { 
        bookmark,
        username,
        userIconId,
      });
      console.log('Connected to server:', serverId);

      // Add to active servers and open window
      addActiveServer(serverId, {
        id: serverId,
        name: bookmark.name,
        address: bookmark.address,
        port: bookmark.port,
      });
      setFocusedServer(serverId);
    } catch (error) {
      console.error('Failed to connect:', error);
      
      // Format error message for display
      const errorMessage = String(error);
      let userFriendlyMessage = 'Failed to connect to server.';
      
      if (errorMessage.includes('Cannot connect to tracker') || errorMessage.includes('tracker')) {
        userFriendlyMessage = 'Trackers cannot be connected to directly. Click on the tracker to expand it and browse servers.';
      } else if (errorMessage.includes('nodename nor servname provided') || errorMessage.includes('not known')) {
        userFriendlyMessage = 'Unable to resolve server address. Please check the server address and try again.';
      } else if (errorMessage.includes('Connection refused')) {
        userFriendlyMessage = 'Connection refused. The server may be offline or the port may be incorrect.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Connection timed out. The server may be unreachable.';
      } else if (errorMessage.includes('early eof') || errorMessage.includes('handshake')) {
        userFriendlyMessage = 'Connection failed: Server did not respond correctly. This may be a tracker - click to expand instead of connecting.';
      } else if (errorMessage.includes('Failed to connect')) {
        // Extract the actual error from the message
        const match = errorMessage.match(/Failed to connect: (.+)/);
        if (match && match[1]) {
          userFriendlyMessage = `Connection failed: ${match[1]}`;
        }
      }
      
      // Store error message for this bookmark
      setConnectionErrors((prev) => {
        const next = new Map(prev);
        next.set(bookmark.id, userFriendlyMessage);
        return next;
      });
    } finally {
      setConnectingId(null);
    }
  };

  const fetchTrackerServers = async (trackerId: string) => {
    const tracker = bookmarks.find(b => b.id === trackerId);
    if (!tracker || tracker.type !== 'tracker') return;
    
    setLoadingTrackers((prev) => new Set(prev).add(trackerId));
    
    try {
      interface TrackerServer {
        address: string;
        port: number;
        users: number;
        name?: string | null;
        description?: string | null;
      }
      
      const servers = await invoke<TrackerServer[]>('fetch_tracker_servers', {
        address: tracker.address,
        port: tracker.port || undefined,
      });
      
      // Convert TrackerServer to ServerBookmark format
      const serverBookmarks: ServerBookmark[] = servers.map((server, index) => ({
        id: `${trackerId}-${index}`,
        name: server.name || server.address,
        description: server.description || '',
        address: server.address,
        port: server.port,
        users: server.users,
      }));
      
      setTrackerServers((prev) => {
        const next = new Map(prev);
        next.set(trackerId, serverBookmarks);
        return next;
      });
      
      // Clear any previous errors
      setConnectionErrors((prev) => {
        const next = new Map(prev);
        next.delete(trackerId);
        return next;
      });
    } catch (error) {
      console.error('Failed to fetch tracker servers:', error);
      setConnectionErrors((prev) => {
        const next = new Map(prev);
        next.set(trackerId, `Failed to fetch servers: ${error}`);
        return next;
      });
    } finally {
      setLoadingTrackers((prev) => {
        const next = new Set(prev);
        next.delete(trackerId);
        return next;
      });
    }
  };

  const handleToggleTracker = async (trackerId: string) => {
    const isExpanded = expandedTrackers.has(trackerId);
    
    if (isExpanded) {
      // Collapse: remove from expanded set and clear servers
      setExpandedTrackers((prev) => {
        const next = new Set(prev);
        next.delete(trackerId);
        return next;
      });
      setTrackerServers((prev) => {
        const next = new Map(prev);
        next.delete(trackerId);
        return next;
      });
    } else {
      // Expand: fetch servers from tracker
      setExpandedTrackers((prev) => new Set(prev).add(trackerId));
      await fetchTrackerServers(trackerId);
    }
  };

  const handleRefreshTracker = async (trackerId: string) => {
    // Refresh: re-fetch servers if tracker is expanded
    if (expandedTrackers.has(trackerId)) {
      await fetchTrackerServers(trackerId);
    } else {
      // If not expanded, expand it (which will fetch)
      setExpandedTrackers((prev) => new Set(prev).add(trackerId));
      await fetchTrackerServers(trackerId);
    }
  };

  const handleConnectToTrackerServer = async (trackerId: string, server: ServerBookmark) => {
    // Create a bookmark from the tracker server and connect
    // Make sure it's explicitly marked as a server (not tracker)
    const bookmark: Bookmark = {
      id: `${trackerId}-${server.id}`,
      name: server.name,
      address: server.address,
      port: server.port,
      login: 'guest',
      password: undefined,
      icon: undefined,
      autoConnect: false,
      type: 'server', // Explicitly set as server
    };
    
    console.log('Connecting to server from tracker:', bookmark.name, bookmark.address, bookmark.port);
    await handleConnect(bookmark);
  };

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {bookmarks.map((bookmark) => {
          const isTracker = bookmark.type === 'tracker';
          const isExpanded = expandedTrackers.has(bookmark.id);
          const servers = trackerServers.get(bookmark.id) || [];
          const isLoading = loadingTrackers.has(bookmark.id);
          
          return (
            <div key={bookmark.id}>
              {isTracker ? (
                // Tracker display - expandable, no connect button
                <>
                  <div
                    className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-2 group"
                    onClick={() => handleToggleTracker(bookmark.id)}
                  >
                    {/* Chevron expand/collapse button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTracker(bookmark.id);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 w-4 flex items-center justify-center text-xs font-bold"
                      aria-label={isExpanded ? 'Collapse tracker' : 'Expand tracker'}
                      title={isExpanded ? 'Collapse tracker' : 'Expand tracker'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    
                    {/* Tracker icon placeholder */}
                    <div className="w-4 h-4 flex-shrink-0 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">T</span>
                    </div>
                    
                    {/* Tracker name */}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1">
                      {bookmark.name}
                    </span>
                    
                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="flex-shrink-0 w-4 h-4">
                        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                      </div>
                    )}
                    
                    {/* Server count badge when expanded */}
                    {isExpanded && servers.length > 0 && !isLoading && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <span>{servers.length}</span>
                        <span className="text-[10px]">🌐</span>
                      </div>
                    )}
                    
                    {/* Edit/Delete buttons on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBookmark(bookmark);
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Edit tracker"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(bookmark.id);
                        }}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete tracker"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Tracker servers list (when expanded) - nested with indentation */}
                  {isExpanded && (
                    <div className="ml-8">
                      {isLoading ? (
                        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          Loading servers...
                        </div>
                      ) : servers.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          No servers found
                        </div>
                      ) : (
                        servers.map((server) => (
                          <div
                            key={server.id}
                            className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex items-center gap-2 group"
                            onClick={() => handleConnectToTrackerServer(bookmark.id, server)}
                          >
                            {/* Server icon */}
                            <div className="w-4 h-4 flex-shrink-0 bg-gray-400 dark:bg-gray-600 rounded flex items-center justify-center">
                              <span className="text-white text-[8px]">S</span>
                            </div>
                            
                            {/* Server info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                {server.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {server.address}:{server.port}
                                {server.description && ` • ${server.description}`}
                                {server.users > 0 && ` • ${server.users} user${server.users !== 1 ? 's' : ''}`}
                              </div>
                            </div>
                            
                            {/* User count indicator */}
                            {server.users > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>{server.users}</span>
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Regular server bookmark - with connect button
                <div
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-2">
                        {/* Server icon */}
                        <div className="w-4 h-4 flex-shrink-0 bg-gray-400 dark:bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-white text-[8px]">S</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {bookmark.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {bookmark.address}:{bookmark.port} • {bookmark.login}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingBookmark(bookmark)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingId(bookmark.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handleConnect(bookmark)}
                          disabled={connectingId === bookmark.id}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {connectingId === bookmark.id ? 'Connecting...' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Connection error message */}
                  {connectionErrors.has(bookmark.id) && (
                    <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-red-800 dark:text-red-200 font-medium">
                          {connectionErrors.get(bookmark.id)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setConnectionErrors((prev) => {
                            const next = new Map(prev);
                            next.delete(bookmark.id);
                            return next;
                          });
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-xs font-medium"
                        aria-label="Dismiss error"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit dialog */}
      {editingBookmark && (
        <EditBookmarkDialog
          bookmark={editingBookmark}
          onClose={() => setEditingBookmark(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Bookmark
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this bookmark? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
