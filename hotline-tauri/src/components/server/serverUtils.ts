// Utility functions for ServerWindow

// Hotline user flag bits
const USER_FLAG_ADMIN = 0x0001;
const USER_FLAG_IDLE = 0x0002;

export function parseUserFlags(flags: number) {
  return {
    isAdmin: (flags & USER_FLAG_ADMIN) !== 0,
    isIdle: (flags & USER_FLAG_IDLE) !== 0,
  };
}

