
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { APP_NAME, POLICE_LOGO_RAW } from '../constants';

const Header: React.FC = () => {
  const { user, logout, isSidebarOpen, setSidebarOpen } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  return (
    <header className="h-20 bg-[#0a0f1e] border-b border-blue-900/40 flex items-center justify-between px-8 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative z-[100]">
      {/* Authority Logo and Name */}
      <div className="flex items-center gap-5">
        <Link to="/dashboard" className="flex items-center gap-4 group">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-12 w-auto drop-shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-transform group-hover:scale-105" />
          <div className="flex flex-col border-l border-slate-800 pl-4">
            <span className="text-lg font-black tracking-tight text-white uppercase leading-none">
              Bundespolizei
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-blue-500 uppercase mt-1">
              Präsidium Teamstadt
            </span>
          </div>
        </Link>
      </div>

      {/* Center Clock & Status */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/50 rounded-md border border-slate-800">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Netzwerk Status: Gesichert</span>
        </div>
        <div className="font-mono text-sm font-bold text-blue-400 bg-blue-950/30 px-4 py-1.5 rounded-md border border-blue-900/30">
          {time}
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`h-10 w-10 flex items-center justify-center rounded-md transition-all border ${isSidebarOpen ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Benachrichtigungszentrum"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        </button>

        {user.isAdmin && (
          <Link to="/admin" className="h-10 px-4 flex items-center gap-2 bg-amber-600/10 border border-amber-600/30 rounded-md text-[10px] font-black uppercase text-amber-500 hover:bg-amber-600 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            Administration
          </Link>
        )}
        
        <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
          <div className="text-right flex flex-col justify-center">
            <div className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{user.rank}</div>
            <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase leading-none">
              {user.firstName} <span className="text-blue-500">{user.lastName}</span> • {user.badgeNumber}
            </div>
          </div>
          <div className="h-10 w-10 rounded-md bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-blue-400 font-black text-sm">
            {user.lastName[0]}
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="h-10 w-10 flex items-center justify-center rounded-md bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
            title="Abmelden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
