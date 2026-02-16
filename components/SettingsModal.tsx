
import React from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

const SettingsModal: React.FC = () => {
  const { user, isSettingsOpen, setSettingsOpen } = useAuth();
  const navigate = useNavigate();

  if (!isSettingsOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,0.9)] flex flex-col animate-in zoom-in duration-300 overflow-hidden max-h-[80vh]">
        <div className="h-16 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-10 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-5">
            <span className="text-2xl">⚙️</span>
            <span className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em]">Account-Einstellungen</span>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="text-slate-500 hover:text-white transition-all text-2xl p-2 hover:rotate-90">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-4xl text-white font-black shadow-xl">
              {user.lastName[0]}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{user.firstName} {user.lastName}</h2>
              <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-1">{user.badgeNumber} • {user.rank}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Design-Thema</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Teamstadt Blau (Aktiv)</button>
                <button className="bg-slate-800 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Nachtwache Dunkel</button>
              </div>
            </div>
            
            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sicherheit</h3>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Passwort ändern</button>
            </div>
            
            <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-2xl">
              <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Gefahrenzone</h3>
              <button 
                onClick={() => { if(confirm("Dienstbeendigung bestätigen?")) { setSettingsOpen(false); navigate('/'); } }} 
                className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Dienst quittieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
