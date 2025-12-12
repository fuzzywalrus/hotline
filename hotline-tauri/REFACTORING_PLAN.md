# Refactoring Plan for Large Components

## Components Over 1000 Lines

### ServerWindow.tsx (1,292 lines) - **NEEDS REFACTORING**

**Current Issues:**
- Too many responsibilities (event handling, state management, UI rendering)
- 20+ useState hooks
- 15+ useEffect hooks for event listeners
- Multiple handler functions mixed with component logic
- Large JSX rendering section

**Refactoring Strategy:**

#### 1. Extract Custom Hooks
- **`useServerEvents.ts`** - All event listeners (chat, broadcast, users, files, board, news, private messages, status, agreement, banner)
- **`useServerHandlers.ts`** - All handler functions (sendMessage, postBoard, downloadFile, uploadFile, etc.)
- **`useServerState.ts`** - State management (consolidate related state)

#### 2. Extract Sub-Components
- **`ServerHeader.tsx`** - Header with server info, status, disconnect button
- **`ServerBanner.tsx`** - Banner display component
- **`ServerSidebar.tsx`** - Left sidebar with tabs and user list
- **`ServerTabNavigation.tsx`** - Tab navigation buttons

#### 3. Extract Type Definitions
- **`serverTypes.ts`** - Move ChatMessage, User, PrivateMessage, FileItem, NewsCategory, NewsArticle interfaces

#### 4. Extract Utility Functions
- **`serverUtils.ts`** - parseUserFlags, file prefetching logic

**Estimated Reduction:**
- ServerWindow.tsx: ~1,292 lines → ~400-500 lines (main component)
- New files:
  - useServerEvents.ts: ~300-400 lines
  - useServerHandlers.ts: ~200-300 lines
  - useServerState.ts: ~100-150 lines
  - ServerHeader.tsx: ~100-150 lines
  - ServerBanner.tsx: ~50-100 lines
  - ServerSidebar.tsx: ~150-200 lines
  - serverTypes.ts: ~100 lines
  - serverUtils.ts: ~50-100 lines

---

## Components Under 1000 Lines (Monitor)

### BookmarkList.tsx (658 lines) - **ACCEPTABLE BUT COULD BE SPLIT**

**Potential Improvements:**
- Extract `TrackerRow.tsx` - Tracker display component
- Extract `ServerBookmarkRow.tsx` - Server bookmark display component
- Extract `TrackerServerRow.tsx` - Nested tracker server display component
- Extract `useBookmarkHandlers.ts` - Handler functions

**Estimated Reduction:**
- BookmarkList.tsx: ~658 lines → ~300-400 lines
- New components: ~100-150 lines each

---

## Priority

1. **HIGH**: Refactor ServerWindow.tsx (over 1000 lines)
2. **MEDIUM**: Consider splitting BookmarkList.tsx (approaching complexity threshold)

---

## Implementation Order

1. Extract type definitions (low risk, high value)
2. Extract utility functions (low risk)
3. Extract custom hooks (medium risk, test carefully)
4. Extract sub-components (medium risk, test UI)
5. Refactor main component (final step)

