'use client';

import { useClerk } from '@clerk/nextjs';

export function AuthButtons() {
  const { openSignIn, openSignUp } = useClerk();

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button 
        className="tactile-button inline-block text-center px-8 py-4"
        onClick={() => openSignUp({
          routing: 'hash',
          redirectUrl: '/projects',
        })}
      >
        Get Started
      </button>
      
      <button 
        className="tactile-button-secondary inline-block text-center px-8 py-4"
        onClick={() => openSignIn({
          routing: 'hash',
          redirectUrl: '/projects',
        })}
      >
        Sign In
      </button>
    </div>
  );
}
