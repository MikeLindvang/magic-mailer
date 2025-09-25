import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="bg-parchment bg-grain min-h-screen flex items-center justify-center p-8">
      <div className="tactile-card paper-texture p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-headline text-charcoal text-4xl font-bold mb-2">
            Welcome Back
          </h1>
          <p className="font-body text-charcoal/80">
            Sign in to your MagicMailer account
          </p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: {
                width: '100%',
                maxWidth: '400px',
              },
              card: {
                backgroundColor: '#F8F5EE',
                borderRadius: '2rem 1rem 1rem 2rem',
                boxShadow: '0 20px 25px -5px rgba(43, 42, 45, 0.1)',
                border: '1px solid rgba(43, 42, 45, 0.1)',
                padding: '32px',
              },
            },
          }}
          routing="hash" // ✅ REQUIRED: Use hash routing for modal behavior
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/projects"
          afterSignInUrl="/projects"
        />
      </div>
    </div>
  );
}
