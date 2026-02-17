
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { POLICE_LOGO_RAW } from '../constants';

const Footer: React.FC = () => {
  const { user, logout, setSettingsOpen, roles } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const mainRole = roles.find(r => r.id === user.role);
  const userSpecialRoles = roles.filter(r => user.specialRoles?.includes(r.id));

  return (
    <>
      <footer className="h-12 bg-[#0a0f1e]/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-2 z-[100] shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-1 h-full">
          <button 
            onClick={() => setIsStartMenuOpen(!isStartMenuOpen)} 
            className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all ${isStartMenuOpen ? 'bg-blue-600 shadow-lg shadow-blue-600/40' : 'hover:bg-white/10'}`}
          >
            <img src={POLICE_LOGO_RAW} className="h-7 w-auto" alt="Logo" />
          </button>
          
          <div className="flex items-center gap-1 px-3 h-full ml-2">
             <button 
                onClick={() => navigate('/dashboard')}
                className="h-10 px-4 flex items-center gap-2 bg-white/5 border-b-2 border-blue-500 rounded-t-lg text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
             >
                <span className="text-blue-500">🏠</span> Desktop
             </button>
          </div>
        </div>

        <div className="flex items-center gap-6 h-full pr-6">
          <div className="flex flex-col items-end leading-none border-r border-white/10 pr-6 h-full justify-center">
            <span className="text-[12px] font-black text-white">{time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{time.toLocaleDateString('de-DE')}</span>
          </div>
        </div>
      </footer>

      {isStartMenuOpen && (
        <div className="fixed bottom-14 left-2 w-80 bg-[#0f172a] border border-white/10 rounded-3xl p-4 z-[150] shadow-2xl animate-in slide-in-from-bottom-4 backdrop-blur-3xl">
          <div className="p-6 border-b border-white/5 mb-4 flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-black text-white text-xl shadow-lg border border-white/10">
              {user.lastName[0]}
            </div>
            <div className="flex flex-col">
              <div className="text-[11px] font-black uppercase text-white tracking-tighter">{user.rank} {user.lastName}</div>
              <div className="text-[8px] text-blue-500 font-bold uppercase tracking-widest mt-1">{mainRole?.name || user.role}</div>
            </div>
          </div>
          
          {userSpecialRoles.length > 0 && (
            <div className="px-6 mb-4 py-2 bg-indigo-600/5 rounded-2xl border border-indigo-600/10">
              <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-2">Zusatzfunktionen (Sonderrollen):</div>
              <div className="flex flex-wrap gap-1.5">
                {userSpecialRoles.map(sr => (
                  <span key={sr.id} className="bg-indigo-600/10 text-indigo-400 text-[7px] px-2 py-0.5 rounded border border-indigo-600/20 uppercase font-black">{sr.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
             <button onClick={() => { setIsStartMenuOpen(false); setSettingsOpen(true); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 text-slate-300 rounded-2xl transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Einstellungen</span>
             </button>
             {user.isAdmin && (
               <button onClick={() => { setIsStartMenuOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/5 text-slate-300 rounded-2xl transition-all group">
                  <span className="text-lg group-hover:scale-110 transition-transform">🛡️</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Admin-Bereich</span>
               </button>
             )}
             <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-4 p-4 hover:bg-red-900/20 text-red-500 rounded-2xl transition-all group">
                <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Abmelden</span>
             </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
