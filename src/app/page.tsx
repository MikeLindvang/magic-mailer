import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AuthButtons } from '@/components/auth-buttons';

export default async function Home() {
  const { userId } = await auth();
  
  // If user is already authenticated, redirect to dashboard
  if (userId) {
    redirect('/projects');
  }

  return (
    <div className="min-h-screen bg-parchment bg-grain flex items-center justify-center p-8">
      <div className="tactile-card paper-texture p-12 text-center max-w-2xl">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="font-headline text-6xl font-bold text-charcoal">
              MagicMailer
            </h1>
            <p className="font-body text-charcoal/80 text-xl leading-relaxed">
              AI-powered email marketing platform that transforms your campaigns with intelligent automation and personalization.
            </p>
          </div>
          
          <AuthButtons />
          
          <div className="pt-8 border-t border-charcoal/10">
            <p className="font-body text-charcoal/60 text-sm">
              Join thousands of businesses already using MagicMailer to grow their audience and increase conversions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
