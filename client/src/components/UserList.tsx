import React from 'react';

interface User {
  _id: string;
  username: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

interface UserListProps {
  users: User[];
  currentUser: User;
  currentChat: string | null;
  typingStatus: { [key: string]: boolean };
  onUserSelect: (userId: string) => void;
  onLogout: () => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  currentUser,
  currentChat,
  typingStatus,
  onUserSelect,
  onLogout,
}) => {
  return (
    <div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-800">Chats</h1>
        </div>
        <button
          onClick={onLogout}
          className="text-sm bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 focus:outline-none cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* Current User Profile */}
      <div className="p-4 border-b border-gray-100 bg-blue-50 flex items-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-lg">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500"></span>
        </div>
        <div className="ml-4 flex-1">
          <div className="flex justify-between">
            <h2 className="font-medium text-gray-900">{currentUser.username}</h2>
            <span className="text-xs font-medium text-green-600">You</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-green-600 font-medium">Online</span>
          </p>
        </div>
      </div>
      
      {/* Contacts Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contacts</h2>
      </div>
      
      {/* User list */}
      <div className="overflow-y-auto flex-1">
        {users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No contacts available</p>
          </div>
        ) : (
          <div>
            {users.map((user) => {
              // Assume all users in the list are online for newly logged in users
              const userStatus = user.status === 'offline' ? 'offline' : 'online';
              
              return (
                <div
                  key={user._id}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                    currentChat === user._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => onUserSelect(user._id)}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        userStatus === 'online' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></span>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h2 className="font-medium text-gray-900">{user.username}</h2>
                      <span className={`text-xs font-medium ${userStatus === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                        {userStatus === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {typingStatus[user._id] ? (
                        <span className="text-green-600 font-medium flex items-center">
                          <span className="inline-block w-1.5 h-1.5 bg-green-600 rounded-full mr-1 animate-pulse"></span>
                          Typing...
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {userStatus === 'offline' && 'Last seen: ' + new Date(user.lastSeen).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList; 