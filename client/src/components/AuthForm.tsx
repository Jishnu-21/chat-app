import React from 'react';

interface AuthFormProps {
  authMode: 'login' | 'register';
  authError: string;
  authForm: {
    username: string;
    password: string;
  };
  onAuthSubmit: (e: React.FormEvent) => void;
  onAuthInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAuthModeChange: (mode: 'login' | 'register') => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  authMode,
  authError,
  authForm,
  onAuthSubmit,
  onAuthInputChange,
  onAuthModeChange,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Chat App
          </h1>
        </div>

        <h2 className="text-xl font-semibold mb-6 text-center text-gray-700">
          {authMode === 'login' ? 'Log In' : 'Create Account'}
        </h2>

        {authError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {authError}
            </div>
          </div>
        )}

        <form onSubmit={onAuthSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">Username</label>
            <input
              type="text"
              name="username"
              value={authForm.username}
              onChange={onAuthInputChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={authForm.password}
              onChange={onAuthInputChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition duration-150 ease-in-out cursor-pointer"
          >
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm border-t border-gray-200 pt-5">
          {authMode === 'login' ? (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => onAuthModeChange('register')}
                className="text-blue-500 hover:text-blue-700 font-medium cursor-pointer focus:outline-none transition duration-150 ease-in-out"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => onAuthModeChange('login')}
                className="text-blue-500 hover:text-blue-700 font-medium cursor-pointer focus:outline-none transition duration-150 ease-in-out"
              >
                Sign In
              </button>
            </p>
          )}
         <p className="text-gray-500 text-sm">Made by Jishnu JP</p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm; 