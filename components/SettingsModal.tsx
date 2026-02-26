
import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { db, updateDoc, doc } from '../firebase';

const SettingsModal: React.FC = () => {
  const { user, isSettingsOpen, setSettingsOpen, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  if (!isSettingsOpen || !user) return null;

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      setStatus({ type: 'error', message: 'Passwörter stimmen nicht überein.' });
      return;
    }
    if (passwords.new.length < 4) {
      setStatus({ type: 'error', message: 'Passwort muss mindestens 4 Zeichen lang sein.' });
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.id), { password: passwords.new });
      setStatus({ type: 'success', message: 'Passwort erfolgreich geändert.' });
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (e) {
      setStatus({ type: 'error', message: 'Fehler beim Speichern des Passworts.' });
    }
  };

  const handleThemeChange = async (theme: 'blue' | 'dark') => {
    try {
      await updateDoc(doc(db, "users", user.id), { theme });
      setStatus({ type: 'success', message: 'Design-Thema aktualisiert.' });
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      console.error("Error updating theme:", e);
      setStatus({ type: 'error', message: 'Fehler beim Ändern des Designs.' });
    }
  };

  const handleLogout = () => {
    logout();
    setSettingsOpen(false);
    navigate('/');
  };

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
          {status && (
            <div className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {status.message}
            </div>
          )}
          {!showLogoutConfirm ? (
            <>
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
                    <button 
                      onClick={() => handleThemeChange('blue')}
                      className={`${user.theme === 'blue' || !user.theme ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'} py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                    >
                      Teamstadt Blau {(!user.theme || user.theme === 'blue') && '(Aktiv)'}
                    </button>
                    <button 
                      onClick={() => handleThemeChange('dark')}
                      className={`${user.theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'} py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:text-white`}
                    >
                      Nachtwache Dunkel {user.theme === 'dark' && '(Aktiv)'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sicherheit</h3>
                  {isChangingPassword ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Neues Passwort</label>
                        <input 
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Bestätigen</label>
                        <input 
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setIsChangingPassword(false)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={handlePasswordChange}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsChangingPassword(true)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      Passwort ändern
                    </button>
                  )}
                </div>
                
                <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-2xl">
                  <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Gefahrenzone</h3>
                  <button 
                    onClick={() => setShowLogoutConfirm(true)} 
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Dienst quittieren
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center text-5xl mx-auto animate-bounce">
                🚪
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Dienst beenden?</h2>
                <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">Möchten Sie sich wirklich aus dem System abmelden und Ihren Dienst für heute beenden?</p>
              </div>
              <div className="flex gap-4 max-w-sm mx-auto">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                >
                  Negativ
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20"
                >
                  Bestätigen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
