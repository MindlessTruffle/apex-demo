import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import ApexApp from './ApexApp.jsx';
import DiscordClone from './DiscordClone.jsx';
import './index.css';

const AppWrapper = () => {
  const [currentApp, setCurrentApp] = useState('apex');

  return (
    <div className="relative">
      {/* 1. The App Render Area */}
      <div className="w-full h-full">
        {currentApp === 'apex' ? <ApexApp /> : <DiscordClone />}
      </div>

      {/* 2. The Floating Switcher Button (Fixed to bottom-right) */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 font-sans">
        <div className="bg-black/80 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-t-lg text-center uppercase tracking-wider border border-white/10">
          Demo Switcher
        </div>
        <div className="flex shadow-2xl rounded-b-lg overflow-hidden border border-white/10 bg-stone-900">
          <button
            onClick={() => setCurrentApp('apex')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              currentApp === 'apex' 
                ? 'bg-indigo-600 text-white' 
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            Apex Dashboard
          </button>
          <div className="w-[1px] bg-white/10"></div>
          <button
            onClick={() => setCurrentApp('discord')}
            className={`px-6 py-3 font-bold text-sm transition-all duration-200 ${
              currentApp === 'discord' 
                ? 'bg-[#5865F2] text-white' 
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            Discord Clone
          </button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
);