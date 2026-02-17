
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { APP_NAME, POLICE_LOGO_RAW } from '../constants';
import { dbCollections, addDoc } from '../firebase';

const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [modalType, setModalType] = useState<'Internetwache' | 'Bewerbung' | 'News' | 'Login' | null>(null);
  const [appStep, setAppStep] = useState<'Selection' | 'Form'>('Selection');
  const [iwStep, setIwStep] = useState<'Selection' | 'Anzeige' | 'Hinweis'>('Selection');
  const [careerPath, setCareerPath] = useState<'Mittlerer Dienst' | 'Gehobener Dienst'>('Mittlerer Dienst');
  const [submitted, setSubmitted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Login States
  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const generateCaseId = () => `BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false);
    setIsLoggingIn(true);
    const success = await login(badge, password);
    setIsLoggingIn(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setLoginError(true);
    }
  };

  const handleSubmission = async (e: React.FormEvent, type: 'Bewerbung' | 'Anzeige' | 'Hinweis') => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      if (type === 'Bewerbung') {
        await addDoc(dbCollections.applications, {
          name: `${formData.get('firstname')} ${formData.get('lastname')}`,
          careerPath: careerPath,
          position: careerPath === 'Mittlerer Dienst' ? 'Polizeiobermeister-Anwärter' : 'Polizeikommissar-Anwärter',
          oocAge: formData.get('oocAge'),
          icBirthDate: formData.get('icBirthDate'),
          icPhone: formData.get('icPhone'),
          discordId: formData.get('discordId'),
          motivation: formData.get('motivation'),
          cv: formData.get('cv'),
          status: 'Eingegangen',
          timestamp: new Date().toISOString()
        });
      } else if (type === 'Anzeige') {
        await addDoc(dbCollections.reports, {
          reportNumber: generateCaseId(),
          type: 'Strafanzeige',
          status: 'Unbearbeitet',
          date: new Date().toISOString(),
          officerName: 'Internetwache (Automatisch)',
          officerBadge: 'IW-SYSTEM',
          applicant: formData.get('name'),
          suspect: formData.get('suspect') || 'Unbekannt',
          incidentDetails: formData.get('reason'),
          violation: 'Bürgeranzeige via Internetwache',
          timestamp: new Date().toISOString()
        });
      } else if (type === 'Hinweis') {
        await addDoc(dbCollections.submissions, {
          type: 'Hinweis',
          title: formData.get('subject') || 'Anonymer Hinweis',
          content: formData.get('message'),
          contactInfo: formData.get('contact') || 'Anonym',
          timestamp: new Date().toISOString(),
          status: 'Neu'
        });
      }

      setSubmitted(true);
      setTimeout(() => {
        setModalType(null);
        setAppStep('Selection');
        setIwStep('Selection');
        setSubmitted(false);
      }, 2000);
    } catch (e) {
      console.error("Submission Error:", e);
      alert("Fehler beim Senden.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 overflow-x-hidden selection:bg-blue-600/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] pointer-events-none"></div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in">
          <div className={`w-full ${(modalType === 'Bewerbung' && appStep === 'Form') || (modalType === 'Internetwache' && iwStep !== 'Selection') ? 'max-w-4xl' : 'max-w-xl'} bg-[#0a111f] border border-white/5 rounded-3xl p-8 lg:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden max-h-[95vh] flex flex-col relative`}>
            
            {submitted ? (
              <div className="text-center space-y-6 animate-in zoom-in py-12">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto border border-emerald-500/20">✓</div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Erfolgreich übermittelt</h2>
                <p className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Die Bundespolizei dankt für Ihre Mitarbeit.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <button onClick={() => { setModalType(null); setAppStep('Selection'); setIwStep('Selection'); }} className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white z-50 transition-colors">✕</button>

                {modalType === 'Login' ? (
                  <div className="animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-10 text-center">
                      <img src={POLICE_LOGO_RAW} alt="BPOL Badge" className="h-32 w-auto mb-6" />
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Intranet Login</h2>
                      <p className="text-blue-500 text-[9px] uppercase tracking-[0.4em] font-black mt-2">Präsidium Teamstadt</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                      {loginError && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">Zugangsdaten inkorrekt</div>}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Dienstnummer</label>
                        <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white uppercase font-black text-sm focus:border-blue-600 outline-none" placeholder="ADLER 00/00" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Sicherheitsschlüssel</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white outline-none focus:border-blue-600" placeholder="Passwort" required />
                      </div>
                      <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">
                        {isLoggingIn ? "Authentifizierung..." : "Login bestätigen"}
                      </button>
                    </form>
                  </div>
                ) : modalType === 'News' ? (
                  <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Presseinformationen</h2>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Teamstadt, 14.05.2026</div>
                        <h3 className="text-xl font-black text-white uppercase mb-3">Erfolgreicher Schlag gegen organisierte Kriminalität</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">Die Bundespolizei Teamstadt konnte am heutigen Morgen mehrere Durchsuchungsbeschlüsse vollstrecken...</p>
                      </div>
                    ))}
                  </div>
                ) : modalType === 'Internetwache' ? (
                  <div className="flex flex-col h-full animate-in fade-in">
                    {iwStep === 'Selection' ? (
                      <div className="space-y-10 py-4 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Internetwache</h2>
                          <p className="text-slate-400 text-sm max-w-lg mx-auto">Wählen Sie Ihr Anliegen aus.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => setIwStep('Anzeige')} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-blue-500/50 transition-all group">
                              <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-6">⚖️</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Strafanzeige</h3>
                              <div className="mt-6 text-[10px] font-black text-blue-500 uppercase tracking-widest">Vorgang starten ➔</div>
                           </button>
                           <button onClick={() => setIwStep('Hinweis')} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-amber-500/50 transition-all group">
                              <div className="w-16 h-16 bg-amber-600/20 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mb-6">💡</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Anonymer Hinweis</h3>
                              <div className="mt-6 text-[10px] font-black text-amber-500 uppercase tracking-widest">Hinweis geben ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : iwStep === 'Anzeige' ? (
                      <div className="space-y-8 flex flex-col h-full">
                        <div className="flex justify-between items-center">
                          <button onClick={() => setIwStep('Selection')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">← Zurück</button>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Online-Strafanzeige</h2>
                        </div>
                        <form onSubmit={(e) => handleSubmission(e, 'Anzeige')} className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                           <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/20 text-blue-400 text-xs italic">Wichtiger Hinweis: Das Erstatten einer Anzeige ist ein rechtsverbindlicher Vorgang.</div>
                           <div className="grid grid-cols-2 gap-4">
                              <input name="name" required placeholder="Ihr Vor- und Zuname" className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" />
                              <input name="contact" required placeholder="E-Mail / Telefon" className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" />
                           </div>
                           <input name="suspect" placeholder="Angaben zum Täter (falls bekannt)" className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none focus:border-blue-600" />
                           <textarea name="reason" required rows={6} placeholder="Detaillierte Schilderung des Sachverhalts (Ort, Zeit, Hergang)..." className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white text-sm outline-none resize-none focus:border-blue-600"></textarea>
                           <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]">Anzeige rechtsverbindlich absenden</button>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex justify-between items-center">
                          <button onClick={() => setIwStep('Selection')} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">← Zurück</button>
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Anonymer Hinweis</h2>
                        </div>
                        <form onSubmit={(e) => handleSubmission(e, 'Hinweis')} className="space-y-6">
                          <input name="subject" required className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white outline-none focus:border-amber-600" placeholder="Betreff des Hinweises" />
                          <textarea name="message" required rows={5} className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white outline-none resize-none focus:border-amber-600" placeholder="Was möchten Sie uns mitteilen?"></textarea>
                          <input name="contact" className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white outline-none focus:border-amber-600" placeholder="Kontakt für Rückfragen (Optional)" />
                          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]">Hinweis übermitteln</button>
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col h-full animate-in fade-in">
                    {appStep === 'Selection' ? (
                      <div className="space-y-10 py-4 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Karriere bei der Bundespolizei</h2>
                          <p className="text-slate-400 text-sm max-w-lg mx-auto">Wählen Sie Ihre gewünschte Laufbahn aus.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => { setCareerPath('Mittlerer Dienst'); setAppStep('Form'); }} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-blue-500/50 transition-all group">
                              <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-6">🛡️</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Mittlerer Dienst</h3>
                              <div className="mt-6 text-[10px] font-black text-blue-500 uppercase tracking-widest">Jetzt bewerben ➔</div>
                           </button>
                           <button onClick={() => { setCareerPath('Gehobener Dienst'); setAppStep('Form'); }} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-indigo-500/50 transition-all group">
                              <div className="w-16 h-16 bg-indigo-600/20 text-indigo-500 rounded-2xl flex items-center justify-center text-3xl mb-6">🎓</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Gehobener Dienst</h3>
                              <div className="mt-6 text-[10px] font-black text-indigo-500 uppercase tracking-widest">Jetzt bewerben ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="mb-6 flex items-center justify-between">
                           <button onClick={() => setAppStep('Selection')} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-bold text-white transition-all"><span>←</span> Zurück</button>
                           <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">Laufbahn: {careerPath}</div>
                        </div>
                        <form onSubmit={(e) => handleSubmission(e, 'Bewerbung')} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <input name="firstname" required placeholder="Vorname" className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none focus:border-blue-600" />
                                <input name="lastname" required placeholder="Nachname" className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none focus:border-blue-600" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input name="oocAge" type="number" required placeholder="[OOC] Alter" className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none focus:border-blue-600" />
                                <input name="icBirthDate" type="date" required className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none [color-scheme:dark] focus:border-blue-600" />
                            </div>
                            <input name="icPhone" required placeholder="Telefonnummer IC" className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none focus:border-blue-600" />
                            <input name="discordId" required placeholder="Discord ID" className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none focus:border-blue-600" />
                            <textarea name="motivation" required rows={4} placeholder="Motivation..." className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none resize-none focus:border-blue-600"></textarea>
                            <textarea name="cv" required rows={6} placeholder="Lebenslauf..." className="w-full bg-[#08101d] border border-white/10 rounded-xl p-4 text-slate-200 text-sm outline-none resize-none focus:border-blue-600"></textarea>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]">🚀 Bewerbung einreichen</button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permanent Public Banner */}
      <nav className="h-28 flex items-center justify-between px-12 backdrop-blur-xl border-b border-blue-900/40 bg-slate-950/40 relative z-[100] shadow-2xl">
        <div className="flex items-center gap-6">
          <img src={POLICE_LOGO_RAW} alt="BPOL Logo" className="h-20 w-auto drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-[-0.05em] drop-shadow-2xl text-center">
            Bundespolizei Teamstadt
          </h1>
          <div className="h-1 w-32 bg-blue-600 rounded-full mt-2 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
        </div>

        <button onClick={() => setModalType('Login')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 border border-white/10">Intranet Login</button>
      </nav>

      <section className="relative pt-32 pb-40 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-7xl lg:text-9xl font-black tracking-tighter text-white mb-10 leading-[0.85] uppercase animate-in slide-in-from-bottom-8 duration-1000">Sicherheit für <br/><span className="bg-gradient-to-r from-blue-600 via-blue-400 to-indigo-600 bg-clip-text text-transparent">Teamstadt.</span></h1>
        <p className="text-slate-400 text-lg lg:text-xl max-w-3xl mx-auto mb-12 animate-in fade-in duration-1000 delay-300">Offizielles Informations- und Serviceportal der Bundespolizei Teamstadt.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto animate-in fade-in duration-1000 delay-500">
           <button onClick={() => setModalType('News')} className="group p-10 bg-slate-900/40 border border-white/5 rounded-[48px] hover:bg-blue-600/10 hover:border-blue-600/30 transition-all text-left">
              <div className="text-4xl mb-6">📰</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Presse</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Aktuelle Einsatzmeldungen und offizielle Presseberichte.</p>
           </button>
           
           <button onClick={() => { setModalType('Internetwache'); setIwStep('Selection'); }} className="group p-1 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[48px] text-left hover:scale-[1.02] transition-all">
              <div className="p-10 bg-slate-950 rounded-[44px] h-full relative overflow-hidden">
                <div className="text-4xl mb-6">🏛️</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Internetwache</h3>
                <p className="text-slate-500 text-sm mb-4">Erstatten Sie Anzeigen oder geben Sie Hinweise anonym ab.</p>
                <div className="mt-8 text-[10px] font-black text-blue-500 uppercase tracking-widest">Portal öffnen ➔</div>
              </div>
           </button>

           <button onClick={() => setModalType('Bewerbung')} className="group p-10 bg-slate-900/40 border border-white/5 rounded-[48px] hover:bg-indigo-600/10 hover:border-indigo-600/30 transition-all text-left">
              <div className="text-4xl mb-6">👨‍✈️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Karriere</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Werden Sie Teil unseres Teams. Bewerben Sie sich jetzt.</p>
           </button>
        </div>
      </section>

      <footer className="py-20 border-t border-white/5 text-center">
         <img src={POLICE_LOGO_RAW} alt="BPOL" className="h-20 w-auto mx-auto mb-8 opacity-20" />
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">© 2026 Bundespolizei Teamstadt - Internes Netzwerk V2.5</p>
      </footer>
    </div>
  );
};

export default PublicHome;
