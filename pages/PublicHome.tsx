
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, addDoc, onSnapshot, query, orderBy, limit, getDocs } from '../firebase';
import { PressRelease, User } from '../types';

const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [modalType, setModalType] = useState<'Internetwache' | 'Bewerbung' | 'News' | 'Login' | null>(null);
  const [appStep, setAppStep] = useState<'Selection' | 'Form'>('Selection');
  const [iwStep, setIwStep] = useState<'Selection' | 'Anzeige' | 'Hinweis'>('Selection');
  const [careerPath, setCareerPath] = useState<'Mittlerer Dienst' | 'Gehobener Dienst'>('Mittlerer Dienst');
  const [submitted, setSubmitted] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [news, setNews] = useState<PressRelease[]>([]);

  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.news, orderBy("timestamp", "desc"), limit(6)), (snap) => {
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PressRelease)));
    });
    return unsub;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      // Prüfe vorab, ob der Nutzer gesperrt ist
      const snap = await getDocs(dbCollections.users);
      const allUsers = snap.docs.map(d => d.data() as User);
      const targetUser = allUsers.find(u => u.badgeNumber.toLowerCase() === badge.toLowerCase());
      
      if (targetUser && targetUser.isLocked) {
        setLoginError("ZUGRIFF VERWEIGERT: IHR ACCOUNT WURDE TEMPORÄR GESPERRT.");
        setIsLoggingIn(false);
        return;
      }
      
      const success = await login(badge, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setLoginError("ZUGRIFF VERWEIGERT: DIENSTKENNUNG ODER SCHLÜSSEL UNGÜLTIG.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("SYSTEMFEHLER BEIM LOGIN.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSubmission = async (e: React.FormEvent, type: 'Bewerbung' | 'Anzeige' | 'Hinweis') => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    formData.forEach((value, key) => { data[key] = value; });

    try {
      if (type === 'Bewerbung') {
        await addDoc(dbCollections.applications, {
          ...data,
          name: `${data.firstname} ${data.lastname}`,
          careerPath: careerPath,
          status: 'Eingegangen',
          timestamp: new Date().toISOString()
        });
      } else if (type === 'Anzeige') {
        await addDoc(dbCollections.reports, {
          type: 'Strafanzeige',
          reportNumber: `ONL-${Math.floor(100000 + Math.random() * 900000)}`,
          status: 'Neu',
          title: data.subject || 'Online-Strafanzeige',
          violation: data.subject || 'Strafanzeige',
          applicant: data.contact || 'Anonym übermittelt',
          location: data.location || 'Nicht angegeben',
          incidentDetails: data.content,
          suspectDescription: data.suspect_info || '',
          officerName: 'System (Online)',
          officerBadge: 'INTERNETWACHE',
          timestamp: new Date().toISOString(),
          isOnlineSubmission: true,
          contactData: `Name: ${data.contact}, Geburtsdatum: ${data.birthdate}, Adresse: ${data.address}, Tel: ${data.phone}, Email: ${data.email}`
        });
      } else if (type === 'Hinweis') {
        await addDoc(dbCollections.submissions, {
          type: 'Hinweis',
          title: data.subject || 'Bürgerhinweis',
          content: data.content,
          location: data.location || 'Unbekannt',
          incidentTime: data.incident_time || '',
          suspectInfo: data.suspect_info || '',
          anonymous: isAnonymous,
          contactName: isAnonymous ? 'Anonym' : data.contact,
          contactBirthdate: isAnonymous ? '' : data.birthdate,
          contactAddress: isAnonymous ? '' : data.address,
          contactPhone: isAnonymous ? '' : data.phone,
          contactEmail: isAnonymous ? '' : data.email,
          timestamp: new Date().toISOString(),
          status: 'Neu'
        });
      }
      setSubmitted(true);
      setTimeout(() => { 
        setModalType(null); 
        setSubmitted(false); 
        setAppStep('Selection'); 
        setIwStep('Selection');
        setIsAnonymous(true);
      }, 2000);
    } catch (e) { alert("Fehler beim Senden."); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-x-hidden selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#334155,transparent)] pointer-events-none"></div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-3xl animate-in fade-in">
          <div className={`w-full ${(modalType === 'Bewerbung' && appStep === 'Form') || (modalType === 'Internetwache') ? 'max-w-6xl' : 'max-w-xl'} bg-[#1e293b] border border-white/10 rounded-[40px] p-0 shadow-2xl max-h-[95vh] flex flex-col relative overflow-hidden transition-all duration-500`}>
            
            <button 
              onClick={() => { setModalType(null); setAppStep('Selection'); setIwStep('Selection'); setIsAnonymous(true); }} 
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white z-50 transition-colors"
            >
              ✕
            </button>

            {submitted ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
                <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto border border-emerald-500/20">✓</div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Übermittlung erfolgt</h2>
                <p className="text-slate-400 uppercase text-[10px] font-black tracking-widest">Die Bundespolizei dankt für Ihre Mitarbeit.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                
                {modalType === 'Login' && (
                  <div className="p-12 animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-10 text-center">
                      <img src={POLICE_LOGO_RAW} alt="BPOL Badge" className="h-32 w-auto mb-6" />
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Intranet Login</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                      <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-white uppercase font-black outline-none focus:border-blue-500 transition-all" placeholder="Dienstnummer" required />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-5 text-white outline-none focus:border-blue-500 transition-all" placeholder="Sicherheitsschlüssel" required />
                      {loginError && <div className="text-red-400 text-[9px] font-black uppercase text-center bg-red-400/10 border border-red-400/20 p-3 rounded-lg leading-relaxed">{loginError}</div>}
                      <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50">
                        {isLoggingIn ? 'Lade...' : 'Login'}
                      </button>
                    </form>
                  </div>
                )}

                {modalType === 'Internetwache' && (
                  <div className="flex flex-col h-full overflow-hidden">
                    {iwStep === 'Selection' ? (
                      <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
                        <div className="bg-red-600/10 border border-red-600/30 p-5 rounded-3xl flex items-center gap-6">
                           <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-red-900/40 animate-pulse shrink-0">🚨</div>
                           <div>
                              <h4 className="text-[11px] font-black text-red-500 uppercase tracking-widest">Wichtiger Hinweis</h4>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">Bei akuter Gefahr oder Notfällen wählen Sie bitte sofort den Notruf <span className="text-red-500">110</span>.</p>
                           </div>
                        </div>

                        <div className="text-center space-y-2">
                          <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Internetwache <span className="text-blue-500">Teamstadt</span></h2>
                          <p className="text-slate-400 text-[10px] uppercase tracking-[0.4em] font-black">Offizielles Portal für Online-Meldungen</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => setIwStep('Anzeige')} className="bg-slate-800/40 border border-white/5 p-10 rounded-[48px] text-left hover:border-blue-500/50 hover:bg-blue-600/5 transition-all group shadow-2xl">
                              <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-blue-600/20 group-hover:scale-110 transition-transform">⚖️</div>
                              <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Strafanzeige <span className="text-blue-500">erstatten</span></h3>
                              <p className="text-slate-400 text-[11px] leading-relaxed uppercase font-bold tracking-widest mb-6">Sie möchten eine Straftat melden, die in den Zuständigkeitsbereich der Bundespolizei fällt.</p>
                              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest pt-6 border-t border-white/5">Vorgang starten ➔</div>
                           </button>

                           <button onClick={() => setIwStep('Hinweis')} className="bg-slate-800/40 border border-white/5 p-10 rounded-[48px] text-left hover:border-amber-500/50 hover:bg-amber-600/5 transition-all group shadow-2xl">
                              <div className="w-16 h-16 bg-amber-600/10 text-amber-500 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-amber-500/20 group-hover:scale-110 transition-transform">💡</div>
                              <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Bürgerhinweis <span className="text-amber-500">geben</span></h3>
                              <p className="text-slate-400 text-[11px] leading-relaxed uppercase font-bold tracking-widest mb-6">Sie haben Informationen über Gefahrensituationen oder verdächtige Personen.</p>
                              <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest pt-6 border-t border-white/5">Meldung verfassen ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={e => handleSubmission(e, iwStep === 'Anzeige' ? 'Anzeige' : 'Hinweis')} className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-500">
                        <div className="p-10 bg-slate-800/60 border-b border-white/10 flex justify-between items-center shrink-0">
                           <div className="space-y-1">
                              <button type="button" onClick={() => { setIwStep('Selection'); setIsAnonymous(true); }} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors">← Zurück zur Auswahl</button>
                              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
                                 {iwStep === 'Anzeige' ? 'Online-Strafanzeige' : 'Bürgerhinweis'} <span className={iwStep === 'Anzeige' ? 'text-blue-500' : 'text-amber-500'}>erstellen</span>
                              </h3>
                           </div>
                           <div className="text-right hidden sm:block">
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Übermittlung</div>
                              <div className="text-emerald-500 font-bold text-xs uppercase bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 tracking-widest">GEL Verschlüsselt</div>
                           </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                           <section className="space-y-6">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">01</div>
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Angaben zur Person</h4>
                                 </div>
                                 {iwStep === 'Hinweis' && (
                                    <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-3">Anonym bleiben?</span>
                                       <div className="flex bg-slate-800 rounded-xl p-1">
                                          <button 
                                             type="button" 
                                             onClick={() => setIsAnonymous(true)}
                                             className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isAnonymous ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                          >
                                             Anonym
                                          </button>
                                          <button 
                                             type="button" 
                                             onClick={() => setIsAnonymous(false)}
                                             className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!isAnonymous ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                          >
                                             Persönlich
                                          </button>
                                       </div>
                                    </div>
                                 )}
                              </div>

                              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-8 rounded-[32px] border border-white/5 transition-all duration-500 ${isAnonymous && iwStep === 'Hinweis' ? 'opacity-20 grayscale pointer-events-none select-none' : 'opacity-100'}`}>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Vollständiger Name</label>
                                    <input name="contact" required={!isAnonymous || iwStep === 'Anzeige'} placeholder={isAnonymous && iwStep === 'Hinweis' ? "ANONYME ÜBERMITTLUNG" : "Vorname, Nachname"} className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Geburtsdatum</label>
                                    <input name="birthdate" type="date" required={!isAnonymous || iwStep === 'Anzeige'} className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                                 </div>
                                 <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Anschrift (Straße, Hausnr, PLZ, Ort)</label>
                                    <input name="address" required={!isAnonymous || iwStep === 'Anzeige'} placeholder="Musterstr. 1, 12345 Teamstadt" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telefon / Kontakt</label>
                                    <input name="phone" required={!isAnonymous || iwStep === 'Anzeige'} placeholder="+49..." className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">E-Mail Adresse</label>
                                    <input name="email" type="email" required={!isAnonymous || iwStep === 'Anzeige'} placeholder="name@beispiel.de" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                                 </div>
                              </div>
                           </section>
                           <section className="space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">02</div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">{iwStep === 'Anzeige' ? 'Angaben zur Tat' : 'Details Ihrer Beobachtung'}</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-8 rounded-[32px] border border-white/5">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Zeitpunkt der Beobachtung</label>
                                    <input name="incident_time" type="datetime-local" required className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Ort des Geschehens (z.B. Gleis, Zug-Nr, Platz)</label>
                                    <input name="location" required placeholder="Wo haben Sie etwas bemerkt?" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Gegenstand des Hinweises / Betreff</label>
                                    <input name="subject" required placeholder={iwStep === 'Anzeige' ? "z.B. Diebstahl" : "z.B. Verdächtige Tasche, Graffitis, Drogenhandel..."} className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-black uppercase tracking-widest focus:border-blue-500 outline-none transition-all placeholder:normal-case" />
                                 </div>
                                 <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">{iwStep === 'Anzeige' ? 'Tathergang' : 'Detaillierte Beschreibung'}</label>
                                    <textarea name="content" required rows={8} className="w-full bg-slate-900/50 border border-white/10 p-8 rounded-[32px] text-slate-200 text-base leading-relaxed outline-none resize-none focus:border-blue-500 transition-all custom-scrollbar" placeholder={iwStep === 'Anzeige' ? "Beschreiben Sie den Vorfall..." : "Beschreiben Sie hier Ihre Beobachtungen so präzise wie möglich (Personenbeschreibung, Fluchtrichtung, Merkmale)..."}></textarea>
                                 </div>
                              </div>
                           </section>
                        </div>

                        <div className="p-10 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between shrink-0">
                           <div className="space-y-1">
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Systemstatus</div>
                              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AES-256 Verschlüsselung</div>
                           </div>
                           <button className={`px-24 py-6 rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all active:scale-95 shadow-2xl ${iwStep === 'Anzeige' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'}`}>
                              {iwStep === 'Anzeige' ? 'Strafanzeige jetzt einreichen' : 'Hinweis jetzt sicher absenden'}
                           </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {modalType === 'Bewerbung' && (
                  <div className="flex flex-col h-full space-y-8 p-12 overflow-y-auto">
                    {appStep === 'Selection' ? (
                       <div className="space-y-10 py-4 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Karriereportal</h2>
                          <p className="text-slate-300 text-sm max-w-lg mx-auto uppercase tracking-widest font-bold">Ihre Zukunft bei der Bundespolizei</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => { setCareerPath('Mittlerer Dienst'); setAppStep('Form'); }} className="bg-slate-800/50 border border-white/10 p-8 rounded-[40px] text-left hover:border-blue-500/50 transition-all group">
                              <div className="text-4xl mb-6">👮‍♂️</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Mittlerer Dienst</h3>
                              <p className="text-slate-400 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Einstieg in den Steifendienst.</p>
                              <div className="mt-6 text-[10px] font-black text-blue-400 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                           <button onClick={() => { setCareerPath('Gehobener Dienst'); setAppStep('Form'); }} className="bg-slate-800/50 border border-white/10 p-8 rounded-[40px] text-left hover:border-indigo-500/50 transition-all group">
                              <div className="text-4xl mb-6">🎓</div>
                              <h3 className="text-2xl font-black text-white uppercase mb-2">Gehobener Dienst</h3>
                              <p className="text-slate-400 text-[10px] leading-relaxed uppercase font-bold tracking-widest">Führungsverantwortung & Studium.</p>
                              <div className="mt-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Auswählen ➔</div>
                           </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={e => handleSubmission(e, 'Bewerbung')} className="space-y-8 animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-4">
                           <button type="button" onClick={() => setAppStep('Selection')} className="text-[10px] font-black text-slate-400 uppercase">← Zurück</button>
                           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bewerbung: {careerPath}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input name="firstname" required placeholder="Vorname" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="lastname" required placeholder="Nachname" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="discordId" required placeholder="Discord ID" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                          <input name="icPhone" required placeholder="Telefonnummer" className="bg-black/40 border border-white/10 p-5 rounded-2xl text-white outline-none" />
                        </div>
                        <div className="space-y-4">
                          <textarea name="motivation" required rows={6} className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] text-white outline-none resize-none focus:border-blue-500" placeholder="Motivation..."></textarea>
                          <textarea name="cv" required rows={6} className="w-full bg-black/40 border border-white/10 p-6 rounded-[32px] text-white outline-none resize-none focus:border-blue-500" placeholder="Lebenslauf..."></textarea>
                        </div>
                        <button className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 rounded-3xl font-black uppercase tracking-widest transition-all shadow-xl">Bewerbung einreichen</button>
                      </form>
                    )}
                  </div>
                )}

                {modalType === 'News' && (
                  <div className="space-y-8 overflow-y-auto p-12 custom-scrollbar">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-8 text-center underline decoration-blue-600 underline-offset-8">Pressemitteilungen</h2>
                    {news.map(n => (
                      <div key={n.id} className="bg-slate-800/80 p-10 rounded-[40px] border border-white/10 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          <span>{new Date(n.timestamp).toLocaleDateString('de-DE')}</span>
                          <span className="bg-blue-600/20 px-3 py-1 rounded-full">{n.category}</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tight">{n.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="h-28 bg-[#1e293b]/95 backdrop-blur-xl border-b border-blue-800/40 flex items-center justify-between px-12 shadow-2xl relative z-[100] shrink-0">
        <img src={POLICE_LOGO_RAW} alt="BPOL" className="h-20 w-auto" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight drop-shadow-2xl text-center whitespace-nowrap">
            Bundespolizei Teamstadt
          </h1>
          <div className="h-1.5 w-40 bg-blue-500 rounded-full mt-2 shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        </div>
        <button onClick={() => setModalType('Login')} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all">Dienst-Login</button>
      </nav>

      <section className="pt-32 pb-40 px-6 max-w-7xl mx-auto text-center relative z-10">
        <h1 className="text-8xl lg:text-[10rem] font-black tracking-tighter text-white mb-10 leading-[0.8] uppercase">
          Sicherheit für <br/>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Teamstadt.</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-24">
           <div onClick={() => setModalType('News')} className="group p-10 bg-slate-800/40 border border-white/10 rounded-[48px] hover:bg-blue-600/10 transition-all text-left cursor-pointer">
              <div className="text-4xl mb-6">📰</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Presse</h3>
              <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-widest">Berichte & News</p>
           </div>
           <div onClick={() => {setModalType('Internetwache'); setIwStep('Selection');}} className="group p-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-[48px] hover:scale-105 transition-all text-left cursor-pointer shadow-[0_20px_60px_rgba(59,130,246,0.1)]">
              <div className="text-4xl mb-6">🏛️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Internetwache</h3>
              <p className="text-blue-400 text-xs uppercase font-black tracking-widest">Anzeigen & Meldungen</p>
           </div>
           <div onClick={() => {setModalType('Bewerbung'); setAppStep('Selection');}} className="group p-10 bg-slate-800/40 border border-white/10 rounded-[48px] hover:bg-indigo-600/10 transition-all text-left cursor-pointer">
              <div className="text-4xl mb-6">👨‍✈️</div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Karriere</h3>
              <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-widest">Bewerbungsportal</p>
           </div>
        </div>
      </section>

      <section className="bg-slate-900/50 border-y border-white/10 py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-12">
           <div className="flex justify-between items-end mb-12">
              <div>
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Aktuelle <span className="text-blue-400">Meldungen</span></h2>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Informationen direkt aus der Pressestelle</p>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.slice(0, 3).map(n => (
                <div key={n.id} className="bg-[#1e293b] border border-white/10 p-8 rounded-[40px] text-left shadow-xl">
                   <div className="text-[10px] font-black text-slate-500 mb-4">{new Date(n.timestamp).toLocaleDateString('de-DE')}</div>
                   <h3 className="text-xl font-black text-white uppercase mb-4 line-clamp-2">{n.title}</h3>
                   <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">{n.content}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      <footer className="py-20 text-center opacity-40">
         <p className="text-[9px] font-black uppercase tracking-[0.5em]">© 2026 Bundespolizei Teamstadt Intranet V3.0</p>
      </footer>
    </div>
  );
};

export default PublicHome;
