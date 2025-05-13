import React from 'react';

interface Message {
  _id: string;
  sender: string;
  recipient: string;
  content: string;
  read: boolean;
  createdAt: string;
  type: 'text' | 'system';
}

interface User {
  _id: string;
  username: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

interface ChatAreaProps {
  currentUser: User;
  currentChat: string | null;
  messages: Message[];
  messageInput: string;
  typingStatus: { [key: string]: boolean };
  users: User[];
  onSendMessage: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onToggleMobileView: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  currentChat,
  messages,
  messageInput,
  typingStatus,
  users,
  onSendMessage,
  onInputChange,
  messagesEndRef,
  onToggleMobileView,
}) => {
  const currentChatUser = users.find((u) => u._id === currentChat);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500 p-6">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-600 font-medium mb-1">No conversation selected</p>
          <p className="text-gray-500 text-sm">Choose a contact to start chatting</p>
        </div>
      </div>
    );
  }

  // Filter out system messages related to online status
  const filteredMessages = messages.filter(
    msg => msg.type !== 'system' || !msg.content.includes('is online') && !msg.content.includes('is offline')
  );

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-lg">
              {currentChatUser?.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <h2 className="font-medium text-lg text-gray-900">{currentChatUser?.username}</h2>
            {typingStatus[currentChat] && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Typing...
              </p>
            )}
          </div>
        </div>
        
        {/* Menu button */}
        <button 
          onClick={onToggleMobileView}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md">
              <svg className="w-16 h-16 mx-auto text-blue-100 mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No messages yet</h3>
              <p className="text-gray-500">Start a conversation with {currentChatUser?.username}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) =>
              msg.type === 'system' ? (
                <div key={msg._id} className="flex justify-center my-3">
                  <div className="bg-gray-200 text-gray-600 px-4 py-1 rounded-full text-xs">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  key={msg._id}
                  className={`flex ${
                    msg.sender === currentUser._id ? 'justify-end' : 'justify-start'
                  } mb-4`}
                >
                  {msg.sender !== currentUser._id && (
                    <div className="self-end mr-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
                        {currentChatUser?.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] p-4 rounded-lg ${
                      msg.sender === currentUser._id
                        ? 'bg-blue-500 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 rounded-tl-none'
                    }`}
                  >
                    <p className="break-words text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-2 text-right ${
                        msg.sender === currentUser._id ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center">
          <input
            type="text"
            value={messageInput}
            onChange={onInputChange}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Type a message..."
            className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={onSendMessage}
            disabled={!messageInput.trim()}
            className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea; 