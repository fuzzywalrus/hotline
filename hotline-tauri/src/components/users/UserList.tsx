interface User {
  userId: number;
  userName: string;
  iconId: number;
}

interface UserListProps {
  users: User[];
  unreadCounts: Map<number, number>;
  onUserClick: (user: User) => void;
}

export default function UserList({ users, unreadCounts, onUserClick }: UserListProps) {
  return (
    <div className="w-48 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
        Users ({users.length})
      </h2>
      <div className="space-y-1">
        {users.map((user) => (
          <div
            key={user.userId}
            onClick={() => onUserClick(user)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-1 px-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Click to send private message"
          >
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center text-xs">
              {user.iconId}
            </div>
            <span className="truncate flex-1">{user.userName}</span>
            {unreadCounts.get(user.userId) ? (
              <div className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCounts.get(user.userId)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
