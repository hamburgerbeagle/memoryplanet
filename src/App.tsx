import React, { useState, useEffect } from 'react';
import MemoryPlanet from './components/MemoryPlanet';
import LaunchPortal from './components/LaunchPortal';
import MemoryList from './components/MemoryList';
import OnboardingFlow from './components/OnboardingFlow';
import { Toaster } from '@/components/ui/sonner';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'planet' | 'launch' | 'list'>('planet');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // 1. Check for nickname
    const nickname = localStorage.getItem('local_user_nickname');
    if (!nickname) {
      setShowOnboarding(true);
    }

    // 2. Standard UUID generator
    const ensureUserId = () => {
      let userId = localStorage.getItem('local_user_uuid');
      if (!userId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          userId = crypto.randomUUID();
        } else {
          userId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
        localStorage.setItem('local_user_uuid', userId);
        console.log('Generated new local_user_uuid:', userId);
      } else {
        console.log('Existing local_user_uuid found:', userId);
      }
    };
    ensureUserId();
  }, []);

  return (
    <div className="w-full h-screen bg-black flex justify-center items-center">
      <main className="w-full max-w-[430px] h-screen bg-[#05060f] overflow-hidden relative shadow-2xl">
        <div className="atmosphere" />
        <div className="nebula" />
        
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingFlow 
              onComplete={() => setShowOnboarding(false)} 
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {view === 'planet' && (
            <MemoryPlanet 
              key="planet"
              onLaunchClick={() => setView('launch')} 
              onExploreClick={() => setView('list')}
            />
          )}
          
          {view === 'launch' && (
            <LaunchPortal 
              key="launch"
              onLaunch={(text) => {
                console.log('Memory launched:', text);
                setView('planet');
              }} 
              onBack={() => setView('planet')} 
            />
          )}

          {view === 'list' && (
            <MemoryList 
              key="list"
              onBack={() => setView('planet')} 
            />
          )}
        </AnimatePresence>

        <Toaster position="top-center" />
      </main>
    </div>
  );
}
