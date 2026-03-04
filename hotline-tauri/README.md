# Hotline Navigator (Tauri Client)

The Tauri/React/Rust client for the Hotline protocol — part of the [Hotline Navigator](https://github.com/fuzzywalrus/hotline) project. A modern, cross-platform client built with Tauri v2, React, and Rust.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20iOS%20%7C%20iPadOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## About

Hotline is a classic Internet protocol and community platform from the 1990s that provided chat, file sharing, news, and message boards. This is a **cross-platform port** of the excellent [Swift/macOS Hotline client](https://github.com/mierau/hotline) by David Mierau — a recreation in Tauri using React and Rust, with the original source providing protocol reference and inspiration.

### Why This Port?

While the original Swift version provides a native macOS experience, this Tauri-based client offers:

- **Cross-Platform Reach**: Runs on macOS, Windows, Linux, iOS, and iPadOS (Android planned) from a single codebase
- **Long-Term Sustainability**: Built on widely-supported technologies (React, Rust, Tauri v2)
- **Broader Community**: Accessible to developers across all platforms
- **Modern Tooling**: Benefits from the React and Rust ecosystems

This project complements the [original Swift client](https://github.com/mierau/hotline). It does not include server software; for hosting your own Hotline server, see [Mobius](https://github.com/jhalter/mobius).

## Features

### Currently Implemented
- ✅ **Server Browser**: Tracker server browsing with bookmark management
- ✅ **Chat**: Public chat rooms with server broadcasts
- ✅ **Private Messaging**: Direct messages with persistent history and unread indicators
- ✅ **User Management**: User lists with admin/idle status indicators
- ✅ **Message Board**: Read and post to server message boards
- ✅ **News**: Browse categories, read articles, post news and replies
- ✅ **File Management**: Browse, download, upload files with progress tracking
- ✅ **File Preview**: Preview images, audio, and text files before downloading
- ✅ **Settings**: Username and icon customization with persistent storage
- ✅ **Server Banners**: Automatic banner download and display
- ✅ **Server Agreements**: Agreement acceptance flow
- ✅ **Notifications**: Toast notifications with history log
- ✅ **Sound Effects**: Classic Hotline sounds (ported from original)
- ✅ **Keyboard Shortcuts**: macOS-style shortcuts (⌘K to connect, ⌘1-4 for tabs, etc.)
- ✅ **Context Menus**: Right-click actions throughout the app
- ✅ **Dark Mode**: Full dark mode support
- ✅ **Transfer List**: Track active and completed file transfers

### Roadmap
- [ ] Account management and permissions
- [ ] Bonjour/mDNS server discovery
- [ ] Auto-reconnect on disconnect
- [ ] Message filtering and blocking
- [ ] Bookmark import/export

## Installation

**Platform support:** macOS (x86_64, ARM64, Universal), Windows (x86_64), Linux (x86_64, ARM64), iOS, and iPadOS. Android is planned. See the [main project README](https://github.com/fuzzywalrus/hotline#platform-support) for details.

### Prerequisites
- **Node.js** 20+ (recommended for Vite 7 / modern Tauri tooling)
- **Rust** (stable channel)
- **Tauri v2** — [Platform-specific requirements](https://v2.tauri.app/start/prerequisites/)

### Development

1. **Clone the repository** (this client lives in the `hotline-tauri` directory of the main repo)
   ```bash
   git clone https://github.com/fuzzywalrus/hotline.git
   cd hotline/hotline-tauri
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   This starts the Vite frontend only.

4. **Run the full desktop app in development mode**
   ```bash
   npm run tauri dev
   ```

### Building

**Frontend only:**
```bash
npm run build
```

**Full application bundle:**
```bash
npm run tauri build
```

**Windows build:**
```bash
npm run build:windows          # Windows x86_64 (MSVC)
```

**macOS-specific builds:**
```bash
npm run build:macos-universal    # Universal binary (Intel + Apple Silicon)
npm run build:macos-intel        # Intel (x86_64) only
npm run build:macos-silicon      # Apple Silicon (aarch64) only
```

**iOS / iPadOS** (requires Xcode and CocoaPods; see repo root for platform support):
```bash
npm run ios:init                 # One-time: generate Xcode project
npm run build:ios                # Build for device
npm run build:ios-simulator      # Build for simulator
npm run ios:dev                  # Run on device
npm run ios:dev:simulator        # Run in simulator
```

**Linux (including ARM64):**
```bash
# Add Rust target for native ARM64 builds (on an ARM machine) or when using a proper cross toolchain
rustup target add aarch64-unknown-linux-gnu

# Build for x86_64 Linux
npm run build:linux

# Build for Linux ARM64 (aarch64)
npm run build:linux-arm
```

Notes:
- Cross-compiling from x86_64 to `aarch64-unknown-linux-gnu` requires an aarch64 cross toolchain (for example `aarch64-linux-gnu-gcc`) or using Docker/CI running on ARM64. For static MUSL builds you may need the `aarch64-unknown-linux-musl` target and musl cross toolchain.
- The `build-release-linux-arm64.sh` helper script attempts to add the ARM64 Rust target automatically.

**Multi-platform release helper:**
```bash
npm run build:release-all
```
This runs the macOS/Windows/Linux build scripts in sequence and packages artifacts under `release/`.

### Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:coverage
```

**macOS Requirements:**
- Both Rust targets: `rustup target add aarch64-apple-darwin x86_64-apple-darwin`
- Minimum macOS version: Big Sur (11.0)
- Universal binaries recommended for distribution

### Release Builds (macOS Code Signing)

For distribution-ready builds with code signing:

1. **Create `.env` file** in project root:
   ```bash
   APPLE_ID="your-apple-id@example.com"
   APP_PASSWORD="your-app-specific-password"
   TEAM_ID="YOUR_TEAM_ID"
   SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
   ```

2. **Run release build:**
   ```bash
   npm run build:release
   ```

   This will:
   - Build a Universal Binary
   - Code sign the application
   - Verify signatures
   - Create a DMG (if `create-dmg` is installed)
   - Output to `release/hotline-navigator-{version}-macos/`

**Notarization:** the script includes commented `notarytool`/`stapler` steps you can enable for your release flow.

**Note:** The `.env` file is gitignored and contains sensitive credentials.

## Project Structure

```
hotline-tauri/
├── src/                          # React frontend (TypeScript + Vite)
│   ├── assets/                   # App images and static UI assets
│   ├── components/
│   │   ├── tracker/              # Server browser and bookmarks
│   │   ├── server/               # Server window shell
│   │   │   └── hooks/            # Server-specific event/handler hooks
│   │   ├── chat/                 # Public and private chat
│   │   ├── board/                # Message board
│   │   ├── news/                 # News reader
│   │   ├── files/                # File browser
│   │   ├── about/                # About dialog
│   │   ├── users/                # User list and info
│   │   ├── settings/             # Preferences
│   │   ├── notifications/        # Toast notifications
│   │   ├── transfers/            # Transfer manager
│   │   ├── update/               # App update UI
│   │   ├── common/               # Shared UI (e.g. Linkify, ContextMenu)
│   │   └── tabs/                 # Tab bar
│   ├── stores/                   # Zustand state management
│   ├── hooks/                    # Custom React hooks
│   ├── test/                     # Frontend test setup/helpers
│   ├── types/                    # TypeScript definitions
│   └── utils/                    # Shared utility functions
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── protocol/             # Hotline protocol implementation
│   │   │   ├── client/           # Client connection (chat, files, news, users)
│   │   │   ├── tracker.rs        # Tracker protocol
│   │   │   ├── types.rs          # Protocol types
│   │   │   ├── transaction.rs    # Transaction handling
│   │   │   └── constants.rs      # Protocol constants
│   │   ├── state/                # Application state
│   │   ├── commands/             # Tauri IPC commands
│   │   ├── lib.rs                # Plugin setup and entry
│   │   └── main.rs               # Application entry point
│   └── tauri.conf.json           # Tauri configuration
├── build-release.sh              # Signed macOS release helper
├── build-release-all.sh          # Multi-platform release helper
├── build-release-linux-arm64.sh  # Linux ARM64 packaging helper
└── public/
    ├── icons/                    # User icons (classic set)
    └── sounds/                   # Sound effects
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@dnd-kit** - Drag and drop functionality

### Backend
- **Rust** - Systems programming language
- **Tauri v2** - Desktop application framework
- **Tokio** - Async runtime
- **Serde** - Serialization/deserialization

## Architecture

### State Management
- **Frontend**: Zustand stores with persistence to localStorage
- **Backend**: Rust AppState with Arc<RwLock<T>> for thread-safe access
- **Communication**: Tauri IPC commands and events

### Protocol Implementation
- Clean-room Rust implementation of the Hotline protocol
- Uses the original Swift client as reference for protocol details
- Async/await architecture with Tokio for network operations
- Event-driven design for real-time updates

### Cross-Platform Considerations
- Platform-agnostic file paths using Tauri's path API
- Conditional platform features (keyboard shortcuts adapt to OS)
- Responsive layout that works on different screen sizes

## Contributing

Contributions are welcome! This project benefits from:
- Bug reports and feature requests via GitHub Issues
- Code contributions via Pull Requests
- Protocol documentation and implementation notes
- Testing on different platforms

When contributing, please:
1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Test on your target platform

## Credits

This project is a port of the excellent **[Hotline client for macOS](https://github.com/mierau/hotline)** by **David Mierau**. The original Swift implementation provided the protocol reference, UI inspiration, and feature set that made this cross-platform port possible.

The Hotline protocol itself was created by **Hotline Communications** in the 1990s.

## License

MIT License - See LICENSE file for details

## Links

- **Hotline Navigator (this repo)**: https://github.com/fuzzywalrus/hotline
- **Releases**: https://github.com/fuzzywalrus/hotline/releases
- **Original Swift Client**: https://github.com/mierau/hotline
- **Mobius (Hotline server)**: https://github.com/jhalter/mobius
- **Issue Tracker**: https://github.com/fuzzywalrus/hotline/issues

---

*Bringing the classic Hotline experience to modern platforms* 🔥
