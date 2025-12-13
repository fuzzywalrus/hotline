# Hotline Navigator v0.1.0

## 🎉 Initial Release

Hotline Navigator is a modern, cross-platform client for the Hotline protocol - bringing the classic 1990s community platform experience to modern systems. This initial release provides a fully functional Hotline client with all core features.

## ✨ Features

### Core Functionality
- **Server Browser**: Browse tracker servers and manage bookmarks with drag-and-drop reordering
- **Server Connection**: Connect to Hotline servers with login credentials and custom user icons
- **Connection Management**: Visual status indicators (connecting, connected, logged-in) with automatic reconnection handling

### Communication
- **Public Chat**: Real-time public chat rooms with message history
- **Private Messaging**: Direct messages with persistent conversation history and unread message indicators
- **Server Broadcasts**: Receive and display server-wide announcements
- **User List**: View connected users with admin/idle status indicators and user information

### Content & Files
- **Message Board**: Read and post messages to server message boards
- **News System**: Browse news categories, read articles, and post news/replies with threaded discussions
- **File Browser**: Navigate server file systems with folder support
- **File Downloads**: Download files with real-time progress tracking
- **File Uploads**: Upload files to servers with progress indicators
- **File Preview**: Preview images, audio files, and text files before downloading
- **Transfer Manager**: Track active and completed file transfers in a dedicated window

### Server Features
- **Server Banners**: Automatic download and display of server banner images
- **Server Agreements**: Accept server terms of service with persistent storage
- **Server Information**: Display server name, version, description, and user count

### User Experience
- **Dark Mode**: Full dark mode support with system preference detection
- **Keyboard Shortcuts**: macOS-style shortcuts (⌘K to connect, ⌘1-4 for tabs, etc.)
- **Context Menus**: Right-click actions throughout the application
- **Notifications**: Toast notifications with history log
- **Sound Effects**: Classic Hotline sound effects (login, message, etc.) with volume control
- **Settings**: Customize username, user icon (629 classic icons available), and preferences

### Admin Features
- **User Management**: Disconnect users from servers (requires admin permissions)
- **Permission System**: Access control based on server permissions

### Bookmarks
- **Bookmark Management**: Create, edit, delete, and reorder server bookmarks
- **Default Servers**: Pre-loaded default Hotline servers and trackers
- **Bookmark Persistence**: Automatic save/load of bookmarks across sessions
- **Drag & Drop**: Reorder bookmarks with visual feedback

## 📦 Installation

1. Download `Hotline Navigator_0.1.0_universal.dmg`
2. Open the DMG file
3. Drag `Hotline Navigator` to your Applications folder
4. Launch from Applications (you may need to allow it in System Settings > Privacy & Security on first launch)

## 🖥️ System Requirements

- **macOS Big Sur (11.0)** or later
- **Universal Binary** - Works on both Intel (x86_64) and Apple Silicon (aarch64) Macs
- Internet connection for connecting to Hotline servers

## 🎯 What's Working

This release includes all core Hotline protocol features:
- ✅ Complete protocol implementation (TRTP/HOTL handshake, login, transactions)
- ✅ Real-time event handling (chat, user joins/leaves, file updates)
- ✅ File transfer protocol (downloads and uploads)
- ✅ Message board and news protocols
- ✅ User management and permissions
- ✅ Persistent storage for bookmarks and preferences

## 🚧 Known Limitations

- **Windows/Linux builds**: Coming soon (this release is macOS-only)
- **Bonjour/mDNS**: Server discovery via Bonjour not yet implemented
- **Account Management**: Server account creation/editing UI not yet implemented
- **Bookmark Import/Export**: Manual bookmark sharing not yet available
- **Auto-reconnect**: Manual reconnection required after network interruptions

## 🐛 Bug Reports

Found a bug? Please report it at: [GitHub Issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)

## 🙏 Credits

**Hotline Navigator** is built with:
- [Tauri](https://tauri.app/) - Cross-platform desktop framework
- [React](https://react.dev/) - UI framework
- [Rust](https://www.rust-lang.org/) - Systems programming
- [Tailwind CSS](https://tailwindcss.com/) - Styling

**Special Thanks:**
- [Mierau](https://github.com/mierau) - Original [Hotline client for macOS](https://github.com/mierau/hotline) which served as the reference implementation
- The Hotline community - For keeping the protocol alive

**Protocol:**
- Hotline protocol created by Hotline Communications in the 1990s

## 📄 License

MIT License - See LICENSE file for details

---

*Bringing the classic Hotline experience to modern platforms* 🔥
