import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { ConnectionStatus } from '../../../types';
import type { ChatMessage, FileItem, User } from '../serverTypes';
import { useSound } from '../../../hooks/useSound';

interface UseServerEventsProps {
  serverId: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setBoardPosts: React.Dispatch<React.SetStateAction<string[]>>;
  setPrivateMessageHistory: React.Dispatch<React.SetStateAction<Map<number, any[]>>>;
  setUnreadCounts: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  setDownloadProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setUploadProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setAgreementText: React.Dispatch<React.SetStateAction<string | null>>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  setFileCache: (serverId: string, path: string[], files: FileItem[]) => void;
  currentPathRef: React.MutableRefObject<string[]>;
  parseUserFlags: (flags: number) => { isAdmin: boolean; isIdle: boolean };
}

export function useServerEvents({
  serverId,
  setMessages,
  setUsers,
  setFiles,
  setBoardPosts,
  setPrivateMessageHistory,
  setUnreadCounts,
  setDownloadProgress,
  setUploadProgress,
  setAgreementText,
  setConnectionStatus,
  setFileCache,
  currentPathRef,
  parseUserFlags,
}: UseServerEventsProps) {
  const sounds = useSound();

  // Listen for incoming chat messages
  useEffect(() => {
    const unlisten = listen<ChatMessage>(`chat-message-${serverId}`, (event) => {
      setMessages((prev) => [...prev, {
        ...event.payload,
        timestamp: new Date(),
      }]);
      sounds.playChatSound();
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, sounds, setMessages]);

  // Listen for broadcast messages
  useEffect(() => {
    const unlisten = listen<{ message: string }>(`broadcast-message-${serverId}`, (event) => {
      const broadcastMsg = event.payload.message;
      setMessages((prev) => [
        ...prev,
        {
          userId: 0,
          userName: 'Server',
          message: broadcastMsg,
          timestamp: new Date(),
        },
      ]);
      sounds.playServerMessageSound();
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, sounds, setMessages]);

  // Listen for file list events
  useEffect(() => {
    const unlisten = listen<{ files: FileItem[]; path: string[] }>(`file-list-${serverId}`, (event) => {
      const { files, path } = event.payload;
      
      // Only update UI if this is for the current path
      if (path.join('/') === currentPathRef.current.join('/')) {
        setFiles(files);
      }
      
      // Always cache the file list
      setFileCache(serverId, path, files);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setFiles, setFileCache, currentPathRef]);

  // Listen for new message board posts
  useEffect(() => {
    const unlisten = listen<{ message: string }>(`message-board-post-${serverId}`, (event) => {
      setBoardPosts((prev) => [...prev, event.payload.message]);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setBoardPosts]);

  // Listen for user events
  useEffect(() => {
    const unlistenJoin = listen<{ userId: number; userName: string; iconId: number; flags: number }>(
      `user-joined-${serverId}`,
      (event) => {
        setUsers((prev) => {
          if (prev.some(u => u.userId === event.payload.userId)) {
            return prev;
          }
          const { isAdmin, isIdle } = parseUserFlags(event.payload.flags);
          return [...prev, {
            userId: event.payload.userId,
            userName: event.payload.userName,
            iconId: event.payload.iconId,
            flags: event.payload.flags,
            isAdmin,
            isIdle,
          }];
        });
        sounds.playJoinSound();
      }
    );

    const unlistenLeave = listen<{ userId: number }>(
      `user-left-${serverId}`,
      (event) => {
        setUsers((prev) => prev.filter(u => u.userId !== event.payload.userId));
        sounds.playLeaveSound();
      }
    );

    const unlistenChange = listen<{ userId: number; userName: string; iconId: number; flags: number }>(
      `user-changed-${serverId}`,
      (event) => {
        setUsers((prev) => prev.map(u =>
          u.userId === event.payload.userId
            ? {
                userId: event.payload.userId,
                userName: event.payload.userName,
                iconId: event.payload.iconId,
                flags: event.payload.flags,
                ...parseUserFlags(event.payload.flags),
              }
            : u
        ));
      }
    );

    return () => {
      unlistenJoin.then((fn) => fn()).catch(() => {});
      unlistenLeave.then((fn) => fn()).catch(() => {});
      unlistenChange.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, sounds, setUsers, parseUserFlags]);

  // Listen for private messages
  useEffect(() => {
    const unlisten = listen<{ userId: number; message: string }>(
      `private-message-${serverId}`,
      (event) => {
        const { userId, message } = event.payload;

        sounds.playPrivateMessageSound();

        setPrivateMessageHistory((prev) => {
          const newHistory = new Map(prev);
          const userMessages = newHistory.get(userId) || [];
          newHistory.set(userId, [
            ...userMessages,
            {
              text: message,
              isOutgoing: false,
              timestamp: new Date(),
            },
          ]);
          return newHistory;
        });

        setUnreadCounts((prev) => {
          const newCounts = new Map(prev);
          newCounts.set(userId, (newCounts.get(userId) || 0) + 1);
          return newCounts;
        });
      }
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, sounds, setPrivateMessageHistory, setUnreadCounts]);

  // Listen for download progress events
  useEffect(() => {
    const unlisten = listen<{ fileName: string; bytesReceived: number; totalBytes: number; progress: number }>(
      `download-progress-${serverId}`,
      (event) => {
        const { fileName, progress } = event.payload;
        setDownloadProgress((prev) => new Map(prev).set(fileName, progress));
      }
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setDownloadProgress]);

  // Listen for upload progress events
  useEffect(() => {
    const unlisten = listen<{ fileName: string; bytesSent: number; totalBytes: number; progress: number }>(
      `upload-progress-${serverId}`,
      (event) => {
        const { fileName, progress } = event.payload;
        setUploadProgress((prev) => new Map(prev).set(fileName, progress));
      }
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setUploadProgress]);

  // Listen for download/upload complete and error events
  useEffect(() => {
    const unlistenDownloadComplete = listen<{ fileName: string }>(
      `download-complete-${serverId}`,
      (event) => {
        setDownloadProgress((prev) => {
          const next = new Map(prev);
          next.delete(event.payload.fileName);
          return next;
        });
      }
    );

    const unlistenUploadComplete = listen<{ fileName: string }>(
      `upload-complete-${serverId}`,
      (event) => {
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.delete(event.payload.fileName);
          return next;
        });
      }
    );

    const unlistenDownloadError = listen<{ fileName: string; error: string }>(
      `download-error-${serverId}`,
      (event) => {
        setDownloadProgress((prev) => {
          const next = new Map(prev);
          next.delete(event.payload.fileName);
          return next;
        });
      }
    );

    const unlistenUploadError = listen<{ fileName: string; error: string }>(
      `upload-error-${serverId}`,
      (event) => {
        setUploadProgress((prev) => {
          const next = new Map(prev);
          next.delete(event.payload.fileName);
          return next;
        });
      }
    );

    return () => {
      unlistenDownloadComplete.then((fn) => fn()).catch(() => {});
      unlistenUploadComplete.then((fn) => fn()).catch(() => {});
      unlistenDownloadError.then((fn) => fn()).catch(() => {});
      unlistenUploadError.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setDownloadProgress, setUploadProgress]);

  // Listen for connection status changes
  useEffect(() => {
    const unlisten = listen<{ status: ConnectionStatus }>(
      `status-changed-${serverId}`,
      (event) => {
        const newStatus = event.payload.status;
        setConnectionStatus(newStatus);
        if (newStatus === 'logged-in') {
          sounds.playLoggedInSound();
        }
      }
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, sounds, setConnectionStatus]);

  // Listen for agreement required events
  useEffect(() => {
    const unlisten = listen<{ agreement: string }>(`agreement-required-${serverId}`, (event) => {
      const agreement = event.payload.agreement;
      console.log('✅ Received agreement-required event, agreement length:', agreement.length);
      setAgreementText(agreement);
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [serverId, setAgreementText]);
}

