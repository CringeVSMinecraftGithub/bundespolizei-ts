
import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, POLICE_LOGO_RAW } from '../constants';

const Login: React.FC = () => {
  const [badge, setBadge] = useState('Adler 51/01'); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    if (login(badge, password)) {
      navigate('/dashboard');
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#020617]">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/40 border border-white/10 p-16 rounded-[64px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative z-10 backdrop-blur-3xl animate-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="relative group mb-10">
            <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/40 transition-all duration-1000"></div>
            <img src={POLICE_LOGO_RAW} alt="BPOL Badge" className="h-52 w-auto relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.7)] hover:scale-110 transition-transform duration-700 ease-out cursor-default" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{APP_NAME}</h1>
          <div className="flex items-center gap-3 mt-4">
             <span className="h-[2px] w-6 bg-blue-600 rounded-full"></span>
             <p className="text-blue-500 text-[11px] uppercase tracking-[0.4em] font-black">Intranet Gateway V2.4</p>
             <span className="h-[2px] w-6 bg-blue-600 rounded-full"></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl text-red-500 text-[11px] font-black uppercase tracking-[0.2em] text-center animate-shake flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Zugriff verweigert • Account gesperrt?
            </div>
          )}

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">Dienstkennung</label>
            <div className="relative group">
               <div className="absolute inset-y-0 left-6 flex items-center text-slate-600 pointer-events-none group-focus-within:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </div>
               <input 
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="ADLER 00/00"
                className="w-full bg-black/60 border border-white/5 rounded-[28px] py-6 pl-16 pr-8 text-white placeholder-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 transition-all font-black tracking-[0.2em] uppercase"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">Sicherheitsschlüssel</label>
            <div className="relative group">
               <div className="absolute inset-y-0 left-6 flex items-center text-slate-600 pointer-events-none group-focus-within:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
               </div>
               <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black/60 border border-white/5 rounded-[28px] py-6 pl-16 pr-8 text-white placeholder-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-blue-600 rounded-[28px] blur-xl opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
            <div className="relative bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-[0.97] transition-all flex items-center justify-center gap-4 border border-white/10">
              Terminal Validieren
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        </form>

        <div className="mt-16 pt-12 border-t border-white/5 text-center">
          <div className="flex justify-center gap-6 mb-4 grayscale opacity-40">
             <div className="h-8 w-8 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center font-black text-[10px]">VPN</div>
             <div className="h-8 w-8 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center font-black text-[10px]">AES</div>
             <div className="h-8 w-8 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center font-black text-[10px]">BPOL</div>
          </div>
          <p className="text-[9px] text-slate-600 leading-relaxed uppercase tracking-[0.3em] font-black">
            NUR FÜR AUTORISIERTES PERSONAL<br/>
            SÄMTLICHE ZUGRIFFE WERDEN PROTOKOLLIERT
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
