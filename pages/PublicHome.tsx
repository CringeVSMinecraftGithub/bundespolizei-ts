
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, addDoc, onSnapshot, query, orderBy, limit } from '../firebase';
import { PressRelease } from '../types';

const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [modalType, setModalType] = useState<'Internetwache' | 'Bewerbung' | 'News' | 'Login' | null>(null);
  const [appStep, setAppStep] = useState<'Selection' | 'Form'>('Selection');
  const [iwStep, setIwStep] = useState<'Selection' | 'Anzeige' | 'Hinweis'>('Selection');
  const [careerPath, setCareerPath] = useState<'Mittlerer Dienst' | 'Gehobener Dienst'>('Mittlerer Dienst');
  const [submitted, setSubmitted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [news, setNews] = useState<PressRelease[]>([]);

  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.news, orderBy("timestamp", "desc"), limit(6)), (snap) => {
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PressRelease)));
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false);
    setIsLoggingIn(true);
    const success = await login(badge, password);
    setIsLoggingIn(false);
    if (success) navigate('/dashboard');
    else setLoginError(true);
  };

  const handleSubmission = async (e: React.FormEvent, type: 'Bewerbung' | 'Anzeige' | 'Hinweis') => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      if (type === 'Bewerbung') {
        await addDoc(dbCollections.applications, {
          name: `${formData.get('firstname')} ${formData.get('lastname')}`,
          careerPath: careerPath,
          motivation: formData.get('motivation'),
          cv: formData.get('cv'),
          discordId: formData.get('discordId'),
          icPhone: formData.get('icPhone'),
          status: 'Eingegangen',
          timestamp: new Date().toISOString()
        });
      } else if (type === 'Anzeige' || type === 'Hinweis') {
        await addDoc(dbCollections.submissions, {
          type: type === 'Anzeige' ? 'Strafanzeige' : 'Hinweis',
          title: type === 'Anzeige' ? `Strafanzeige: ${formData.get('subject')}` : 'Bürgerhinweis',
          content: formData.get('content'),
          contactInfo: formData.get('contact'),
          timestamp: new Date().toISOString(),
          status: 'Neu'
        });
      }
      setSubmitted(true);
      setTimeout(() => { setModalType(null); setSubmitted(false); setAppStep('Selection'); setIwStep('Selection'); }, 2000);
    } catch (e) { alert("Fehler beim Senden."); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 overflow-x-hidden selection:bg-blue-600/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] pointer-events-none"></div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in">
          <div className={`w-full ${(modalType === 'Bewerbung' && appStep === 'Form') || (modalType === 'Internetwache' && iwStep !== 'Selection') ? 'max-w-4xl' : 'max-w-xl'} bg-[#0a111f] border border-white/5 rounded-3xl p-8 lg:p-12 shadow-2xl max-h-[95vh] flex flex-col relative overflow-hidden`}>
            {submitted ? (
              <div className="text-center py-20 space-y-6">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto border border-emerald-500/20">✓</div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Übermittlung erfolgt</h2>
                <p className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Die Bundespolizei dankt für Ihre Mitarbeit.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <button onClick={() => { setModalType(null); setAppStep('Selection'); setIwStep('Selection'); }} className="absolute top-8 right-8 p-3 text-slate-500 hover:text-white z-50">✕</button>
                {modalType === 'Login' && (
                  <div className="animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-10 text-center">
                      <img src={POLICE_LOGO_RAW} alt="BPOL Badge" className="h-32 w-auto mb-6" />
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Intranet Login</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                      <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white uppercase font-black" placeholder="Dienstnummer" required />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white outline-none" placeholder="Sicherheitsschlüssel" required />
                      {loginError && <div className="text-red-500 text-[10px] font-black uppercase text-center">Zugriff verweigert</div>}
                      <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">Login</button>
                    </form>
                  </div>
                )}
                {modalType === 'Internetwache' && (
                  <div className="flex flex-col h-full space-y-8">
                    {iwStep === 'Selection' ? (
                      <div className="space-y-10 py-4 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Internetwache</h2>
                          <p className="text-slate-400 text-sm max-w-lg mx-auto uppercase tracking-widest font-bold">Bürgerservice Teamstadt</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => setIwStep('Anzeige')} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-blue-500/50 transition-all group">
                              <div className="text-4xl mb-6">⚖️</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Strafanzeige</h3>
                              <p className="text-slate-500 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Für Straftaten an Bahnhöfen oder Grenzen.</p>
                              <div className="mt-6 text-[10px] font-black text-blue-500 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                           <button onClick={() => setIwStep('Hinweis')} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-amber-500/50 transition-all group">
                              <div className="text-4xl mb-6">💡</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Bürgerhinweis</h3>
                              <p className="text-slate-500 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Gefahrensituationen oder Hinweise mitteilen.</p>
                              <div className="mt-6 text-[10px] font-black text-amber-500 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={e => handleSubmission(e, iwStep === 'Anzeige' ? 'Anzeige' : 'Hinweis')} className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                        <div className="flex justify-between items-center mb-4">
                           <button type="button" onClick={() => setIwStep('Selection')} className="text-[10px] font-black text-slate-500 uppercase">← Zurück</button>
                           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{iwStep} erstellen</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input name="contact" required placeholder="Ihr Name / Kontakt" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500" />
                           <input name="subject" required={iwStep === 'Anzeige'} placeholder="Betreff" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500" />
                        </div>
                        <textarea name="content" required rows={10} className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] text-white outline-none resize-none focus:border-blue-500" placeholder="Details..."></textarea>
                        <button className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black uppercase tracking-widest transition-all">Absenden</button>
                      </form>
                    )}
                  </div>
                )}
                {modalType === 'Bewerbung' && (
                  <div className="flex flex-col h-full space-y-8">
                    {appStep === 'Selection' ? (
                       <div className="space-y-10 py-4 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Karriereportal</h2>
                          <p className="text-slate-400 text-sm max-w-lg mx-auto uppercase tracking-widest font-bold">Ihre Zukunft bei der Bundespolizei</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => { setCareerPath('Mittlerer Dienst'); setAppStep('Form'); }} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-blue-500/50 transition-all group">
                              <div className="text-4xl mb-6">👮‍♂️</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Mittlerer Dienst</h3>
                              <p className="text-slate-500 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Einstieg in den Streifendienst.</p>
                              <div className="mt-6 text-[10px] font-black text-blue-500 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                           <button onClick={() => { setCareerPath('Gehobener Dienst'); setAppStep('Form'); }} className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] text-left hover:border-indigo-500/50 transition-all group">
                              <div className="text-4xl mb-6">🎓</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Gehobener Dienst</h3>
                              <p className="text-slate-500 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Führungsverantwortung & Studium.</p>
                              <div className="mt-6 text-[10px] font-black text-indigo-500 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={e => handleSubmission(e, 'Bewerbung')} className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex justify-between items-center mb-4">
                           <button type="button" onClick={() => setAppStep('Selection')} className="text-[10px] font-black text-slate-500 uppercase">← Zurück</button>
                           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bewerbung: {careerPath}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input name="firstname" required placeholder="Vorname" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="lastname" required placeholder="Nachname" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="discordId" required placeholder="Discord ID" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="icPhone" required placeholder="Telefonnummer" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                        </div>
                        <div className="space-y-4">
                          <textarea name="motivation" required rows={6} className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] text-white outline-none resize-none focus:border-blue-500" placeholder="Warum möchten Sie zu uns? (Motivation)"></textarea>
                          <textarea name="cv" required rows={6} className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] text-white outline-none resize-none focus:border-blue-500" placeholder="Lebenslauf (Wichtigste Stationen)"></textarea>
                        </div>
                        <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl">Bewerbung einreichen</button>
                      </form>
                    )}
                  </div>
                )}
                {modalType === 'News' && (
                  <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-8 text-center underline decoration-blue-600 underline-offset-8">Pressemitteilungen</h2>
                    {news.map(n => (
                      <div key={n.id} className="bg-slate-900/50 p-10 rounded-[40px] border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          <span>{new Date(n.timestamp).toLocaleDateString('de-DE')}</span>
                          <span className="bg-blue-600/20 px-3 py-1 rounded-full">{n.category}</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tight">{n.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                        <div className="pt-6 border-t border-white/5 text-[9px] text-slate-600 font-bold uppercase tracking-widest">Veröffentlicht von: {n.author}</div>
                      </div>
                    ))}
                    {news.length === 0 && <div className="text-center py-20 text-slate-700 italic uppercase font-black text-xs tracking-widest">Keine aktuellen Meldungen</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header aligned with Dashboard Header UI */}
      <nav className="h-28 bg-[#0a0f1e]/95 backdrop-blur-xl border-b border-blue-900/40 flex items-center justify-between px-12 shadow-2xl relative z-[100] shrink-0">
        <img src={POLICE_LOGO_RAW} alt="BPOL" className="h-20 w-auto" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-2xl text-center whitespace-nowrap">
            Bundespolizei Teamstadt
          </h1>
          <div className="h-1.5 w-40 bg-blue-600 rounded-full mt-2 shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
        </div>
        <button onClick={() => setModalType('Login')} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all">Dienst-Login</button>
      </nav>

      {/* Original Hero Section Style */}
      <section className="pt-32 pb-40 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-8xl lg:text-[10rem] font-black tracking-tighter text-white mb-10 leading-[0.8] uppercase">
          Sicherheit <br/>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Digital.</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-24">
           <div onClick={() => setModalType('News')} className="group p-10 bg-slate-900/40 border border-white/5 rounded-[48px] hover:bg-blue-600/10 transition-all text-left cursor-pointer">
              <div className="text-4xl mb-6">📰</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Presse</h3>
              <p className="text-slate-500 text-xs leading-relaxed uppercase font-bold tracking-widest">Berichte & News</p>
           </div>
           <div onClick={() => {setModalType('Internetwache'); setIwStep('Selection');}} className="group p-10 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-white/10 rounded-[48px] hover:scale-105 transition-all text-left cursor-pointer">
              <div className="text-4xl mb-6">🏛️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Internetwache</h3>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Anzeigen & Meldungen</p>
           </div>
           <div onClick={() => {setModalType('Bewerbung'); setAppStep('Selection');}} className="group p-10 bg-slate-900/40 border border-white/5 rounded-[48px] hover:bg-indigo-600/10 transition-all text-left cursor-pointer">
              <div className="text-4xl mb-6">👨‍✈️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Karriere</h3>
              <p className="text-slate-500 text-xs leading-relaxed uppercase font-bold tracking-widest">Bewerbungsportal</p>
           </div>
        </div>
      </section>

      {/* News Preview Section */}
      <section className="bg-slate-950/50 border-y border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-12">
           <div className="flex justify-between items-end mb-12">
              <div>
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Aktuelle <span className="text-blue-500">Meldungen</span></h2>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2">Informationen direkt aus der Pressestelle</p>
              </div>
              <button onClick={() => setModalType('News')} className="text-blue-500 font-black uppercase text-[10px] tracking-widest">Alle Berichte anzeigen</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.slice(0, 3).map(n => (
                <div key={n.id} className="bg-[#0a111f] border border-white/5 p-8 rounded-[40px] text-left hover:border-blue-500/20 transition-all cursor-pointer" onClick={() => setModalType('News')}>
                   <div className="text-[10px] font-black text-slate-600 mb-4">{new Date(n.timestamp).toLocaleDateString('de-DE')}</div>
                   <h3 className="text-xl font-black text-white uppercase mb-4 line-clamp-2">{n.title}</h3>
                   <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed mb-6">{n.content}</p>
                   <button className="text-blue-600 font-black uppercase text-[10px] tracking-widest">Weiterlesen →</button>
                </div>
              ))}
              {news.length === 0 && <div className="col-span-full text-center py-20 text-slate-700 italic">Keine aktuellen Berichte</div>}
           </div>
        </div>
      </section>

      <footer className="py-20 text-center opacity-30">
         <p className="text-[9px] font-black uppercase tracking-[0.5em]">© 2026 Bundespolizei Teamstadt Intranet V3.0</p>
      </footer>
    </div>
  );
};

export default PublicHome;
