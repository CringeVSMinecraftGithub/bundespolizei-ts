
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { POLICE_LOGO_RAW } from '../constants';
import { dbCollections, addDoc, onSnapshot, query, orderBy, limit, getDocs, where, updateDoc, doc } from '../firebase';
import { PressRelease, User, Appointment, AppointmentStatus } from '../types';

const PublicHome: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [modalType, setModalType] = useState<'Internetwache' | 'Bewerbung' | 'News' | 'Login' | 'StatusCheck' | 'TerminBuchung' | 'TerminStatus' | null>(null);
  const [appStep, setAppStep] = useState<'Selection' | 'Info' | 'Form' | 'Success'>('Selection');
  const [iwStep, setIwStep] = useState<'Selection' | 'Anzeige' | 'Hinweis'>('Selection');
  const [careerPath, setCareerPath] = useState<'Mittlerer Dienst' | 'Gehobener Dienst'>('Mittlerer Dienst');
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [checkCode, setCheckCode] = useState('');
  const [checkResult, setCheckResult] = useState<Appointment | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [news, setNews] = useState<PressRelease[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const [badge, setBadge] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.news, orderBy("timestamp", "desc"), limit(6)), (snap) => {
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PressRelease)));
    });

    const fetchOfficers = async () => {
      const snap = await getDocs(dbCollections.users);
      setOfficers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    };
    const fetchRoles = async () => {
      const snap = await getDocs(dbCollections.roles);
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchOfficers();
    fetchRoles();

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
        const code = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
        setTrackingCode(code);
        await addDoc(dbCollections.applications, {
          ...data,
          name: `${data.firstname} ${data.lastname}`,
          careerPath: careerPath,
          status: 'Eingegangen',
          trackingCode: code,
          timestamp: new Date().toISOString()
        });
        setAppStep('Success');
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
      if (type !== 'Bewerbung') {
        setSubmitted(true);
        setTimeout(() => { 
          setModalType(null); 
          setSubmitted(false); 
          setAppStep('Selection'); 
          setIwStep('Selection');
          setIsAnonymous(true);
        }, 2000);
      }
    } catch (e) { alert("Fehler beim Senden."); }
  };

  const checkStatus = async () => {
    if (!checkCode || checkCode.length !== 12) {
      setCheckError("Bitte geben Sie einen gültigen 12-stelligen Code ein.");
      return;
    }
    setIsChecking(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const q = query(dbCollections.applications, where("trackingCode", "==", checkCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCheckError("Keine Bewerbung mit diesem Code gefunden.");
      } else {
        setCheckResult(snap.docs[0].data());
      }
    } catch (e) {
      setCheckError("Fehler beim Abrufen des Status.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleAppointmentBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    formData.forEach((value, key) => { data[key] = value; });

    let partnerName = '';
    if (data.partnerRole === 'Sonstiges') {
      partnerName = data.customPartner || 'Sonstiges';
    } else {
      partnerName = data.partnerRole;
    }

    try {
      const code = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
      setTrackingCode(code);
      await addDoc(dbCollections.appointments, {
        type: 'Extern',
        citizenCode: code,
        citizenEmail: data.email || '',
        partnerUserId: 'ROLE_OR_CUSTOM',
        partnerName: partnerName,
        requestedDate: data.date,
        requestedTime: data.time,
        reason: data.reason,
        status: 'Eingegangen',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusLog: [{
          status: 'Eingegangen',
          timestamp: new Date().toISOString(),
          notes: 'Terminanfrage über das Bürgerportal eingegangen.'
        }]
      });
      setAppStep('Success');
    } catch (e) {
      alert("Fehler bei der Terminbuchung.");
    }
  };

  const checkAppointmentStatus = async () => {
    if (!checkCode || checkCode.length !== 12) {
      setCheckError("Bitte geben Sie einen gültigen 12-stelligen Code ein.");
      return;
    }
    setIsChecking(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const q = query(dbCollections.appointments, where("citizenCode", "==", checkCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCheckError("Kein Termin mit diesem Code gefunden.");
      } else {
        setCheckResult({ id: snap.docs[0].id, ...snap.docs[0].data() } as Appointment);
      }
    } catch (e) {
      setCheckError("Fehler beim Abrufen des Status.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCitizenAppointmentResponse = async (accept: boolean) => {
    if (!checkResult) return;
    
    const newStatus: AppointmentStatus = accept ? 'Bestätigt' : 'In Bearbeitung';
    const note = accept ? "Bürger hat den neuen Termin bestätigt." : "Bürger hat den neuen Termin abgelehnt.";
    
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      statusLog: [
        ...(checkResult.statusLog || []),
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          editorName: "Bürger",
          notes: note
        }
      ]
    };

    try {
      await updateDoc(doc(dbCollections.appointments, checkResult.id), updateData);
      setCheckResult({ ...checkResult, ...updateData });
    } catch (e) {
      alert("Fehler beim Speichern Ihrer Antwort.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-x-hidden selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#334155,transparent)] pointer-events-none"></div>

      {modalType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-3xl animate-in fade-in">
          <div className={`w-full ${(modalType === 'Bewerbung') || (modalType === 'Internetwache') ? 'max-w-6xl' : 'max-w-xl'} bg-[#1e293b] border border-white/10 rounded-[40px] p-0 shadow-2xl max-h-[95vh] flex flex-col relative overflow-hidden transition-all duration-500`}>
            
            <button 
              onClick={() => { setModalType(null); setAppStep('Selection'); setIwStep('Selection'); setIsAnonymous(true); setCheckCode(''); setCheckResult(null); setCheckError(null); }} 
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
                
                {modalType === 'StatusCheck' && (
                  <div className="p-12 animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-10 text-center">
                      <div className="w-20 h-20 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center text-4xl mb-6 border border-blue-600/20">🔍</div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight">Bewerbungsstatus prüfen</h2>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-2">Geben Sie Ihren 12-stelligen Tracking-Code ein</p>
                    </div>
                    
                    {!checkResult ? (
                      <div className="space-y-6">
                        <input 
                          type="text" 
                          maxLength={12}
                          value={checkCode} 
                          onChange={(e) => setCheckCode(e.target.value.replace(/\D/g, ''))} 
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-blue-500 transition-all placeholder:tracking-normal placeholder:text-sm" 
                          placeholder="000000000000" 
                        />
                        {checkError && <div className="text-red-400 text-[10px] font-black uppercase text-center bg-red-400/10 border border-red-400/20 p-4 rounded-xl">{checkError}</div>}
                        <button 
                          onClick={checkStatus}
                          disabled={isChecking || checkCode.length !== 12}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isChecking ? 'Wird geprüft...' : 'Status abrufen'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-black/20 border border-white/5 p-8 rounded-[32px] space-y-6">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aktueller Status</span>
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              checkResult.status === 'Angenommen' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' :
                              checkResult.status === 'Abgelehnt' ? 'bg-red-600/20 text-red-500 border border-red-500/30' :
                              'bg-blue-600/20 text-blue-500 border border-blue-500/30'
                            }`}>
                              {checkResult.status}
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="text-center">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bewerber</h4>
                              <div className="text-xl font-black text-white uppercase">{checkResult.name}</div>
                              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{checkResult.careerPath}</div>
                            </div>
                            
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Informationen der Bundespolizei</h4>
                              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {checkResult.status === 'Eingegangen' && "Ihre Bewerbung ist erfolgreich bei uns eingegangen und wird in Kürze gesichtet."}
                                {checkResult.status === 'In Prüfung' && "Ihre Unterlagen werden aktuell von unserer Personalabteilung geprüft. Bitte haben Sie etwas Geduld."}
                                {checkResult.status === 'Eingeladen' && "Herzlichen Glückwunsch! Sie wurden zu einem persönlichen Gespräch eingeladen. Details folgen per E-Mail."}
                                {checkResult.status === 'Angenommen' && (checkResult.acceptanceInfo || "Herzlichen Glückwunsch! Ihre Bewerbung war erfolgreich. Wir freuen uns auf die Zusammenarbeit.")}
                                {checkResult.status === 'Abgelehnt' && (checkResult.rejectionReason || "Leider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung im aktuellen Auswahlverfahren nicht berücksichtigen können.")}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => { setCheckResult(null); setCheckCode(''); }}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
                        >
                          Andere Bewerbung prüfen
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {modalType === 'TerminBuchung' && (
                  <div className="flex flex-col h-full overflow-hidden">
                    {appStep === 'Success' ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-32 h-32 bg-emerald-500/10 text-emerald-500 rounded-[40px] flex items-center justify-center text-6xl mx-auto border border-emerald-500/20 shadow-2xl shadow-emerald-900/20">📅</div>
                        <div className="space-y-2">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Terminanfrage gesendet</h2>
                          <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.3em]">Ihre Anfrage wird nun von der Behörde geprüft.</p>
                        </div>
                        
                        <div className="bg-black/40 border border-white/10 p-10 rounded-[40px] w-full max-w-md space-y-6 shadow-2xl">
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ihr Termin-Code</h4>
                            <div className="text-4xl font-black text-emerald-500 tracking-[0.3em] font-mono">{trackingCode}</div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                            Speichern Sie diesen Code sorgfältig ab. Sie benötigen ihn, um den Status Ihres Termins jederzeit online abzufragen.
                          </p>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(trackingCode);
                              alert("Code in die Zwischenablage kopiert!");
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                          >
                            Code kopieren
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleAppointmentBooking} className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-500">
                        <div className="p-10 bg-slate-800/60 border-b border-white/10 flex justify-between items-center shrink-0">
                          <div className="space-y-1">
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Termin <span className="text-blue-500">buchen</span></h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Offizielle Terminanfrage an die Bundespolizei</p>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Wunschdatum</label>
                              <input name="date" type="date" required className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Wunschuhrzeit</label>
                              <input name="time" type="time" required className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Ansprechpartner / Abteilung</label>
                              <select 
                                name="partnerRole" 
                                required 
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all cursor-pointer"
                              >
                                <option value="" className="bg-slate-900">Bitte wählen</option>
                                {roles.map(r => (
                                  <option key={r.id} value={r.name} className="bg-slate-900">{r.name}</option>
                                ))}
                                <option value="Sonstiges" className="bg-slate-900">Sonstiges</option>
                              </select>
                            </div>
                            {selectedRole === 'Sonstiges' && (
                              <div className="space-y-2 md:col-span-2 animate-in slide-in-from-top-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Manueller Ansprechpartner</label>
                                <input name="customPartner" required placeholder="Bitte Abteilung oder Person angeben" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                              </div>
                            )}
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Anliegen / Grund</label>
                              <textarea name="reason" required rows={4} className="w-full bg-slate-900/50 border border-white/10 p-8 rounded-[32px] text-slate-200 text-base leading-relaxed outline-none resize-none focus:border-blue-500 transition-all custom-scrollbar" placeholder="Beschreiben Sie kurz Ihr Anliegen..."></textarea>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">E-Mail Adresse (Optional)</label>
                              <input name="email" type="email" placeholder="name@beispiel.de" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-blue-500 outline-none transition-all" />
                            </div>
                          </div>
                        </div>

                        <div className="p-10 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-center shrink-0">
                          <button className="px-32 py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-blue-900/30">
                            Termin jetzt anfragen
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {modalType === 'TerminStatus' && (
                  <div className="p-12 animate-in zoom-in duration-300">
                    <div className="flex flex-col items-center mb-10 text-center">
                      <div className="w-20 h-20 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center text-4xl mb-6 border border-indigo-600/20">📅</div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight">Terminstatus prüfen</h2>
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-2">Geben Sie Ihren 12-stelligen Termin-Code ein</p>
                    </div>
                    
                    {!checkResult ? (
                      <div className="space-y-6">
                        <input 
                          type="text" 
                          maxLength={12}
                          value={checkCode} 
                          onChange={(e) => setCheckCode(e.target.value.replace(/\D/g, ''))} 
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-center text-2xl font-black tracking-[0.5em] outline-none focus:border-blue-500 transition-all placeholder:tracking-normal placeholder:text-sm" 
                          placeholder="000000000000" 
                        />
                        {checkError && <div className="text-red-400 text-[10px] font-black uppercase text-center bg-red-400/10 border border-red-400/20 p-4 rounded-xl">{checkError}</div>}
                        <button 
                          onClick={checkAppointmentStatus}
                          disabled={isChecking || checkCode.length !== 12}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isChecking ? 'Wird geprüft...' : 'Status abrufen'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-black/20 border border-white/5 p-8 rounded-[32px] space-y-6">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aktueller Status</span>
                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              checkResult.status === 'Bestätigt' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' :
                              checkResult.status === 'Abgelehnt' ? 'bg-red-600/20 text-red-500 border border-red-500/30' :
                              checkResult.status === 'Verschoben' ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30' :
                              'bg-blue-600/20 text-blue-500 border border-blue-500/30'
                            }`}>
                              {checkResult.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Datum</h4>
                              <div className="text-sm font-bold text-white uppercase">{checkResult.finalDate || checkResult.requestedDate}</div>
                            </div>
                            <div className="space-y-1 text-right">
                              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Uhrzeit</h4>
                              <div className="text-sm font-bold text-white uppercase">{checkResult.finalTime || checkResult.requestedTime}</div>
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ort</h4>
                              <div className="text-sm font-bold text-white uppercase">{checkResult.location || 'Noch nicht festgelegt'}</div>
                            </div>
                            <div className="space-y-1 text-right">
                              <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Partner</h4>
                              <div className="text-sm font-bold text-white uppercase">{checkResult.partnerName}</div>
                            </div>
                          </div>

                          {checkResult.status === 'Abgelehnt' && checkResult.statusLog?.find(l => l.status === 'Abgelehnt')?.notes && (
                            <div className="bg-red-900/20 p-6 rounded-2xl border border-red-500/20">
                              <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3">Grund der Ablehnung</h4>
                              <p className="text-sm text-red-200 leading-relaxed font-medium">
                                {checkResult.statusLog.filter(l => l.status === 'Abgelehnt').pop()?.notes}
                              </p>
                            </div>
                          )}

                          {checkResult.status === 'Verschoben' && (
                            <div className="bg-indigo-600/10 p-8 rounded-[32px] border border-indigo-600/20 space-y-6 animate-in slide-in-from-top-4">
                              <div className="text-center space-y-2">
                                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Terminvorschlag der Behörde</h4>
                                <p className="text-xs text-slate-400 font-medium">Bitte bestätigen Sie den neuen Termin oder lehnen Sie ihn ab.</p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 bg-black/40 p-6 rounded-2xl border border-white/5">
                                <div className="text-center">
                                  <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Neues Datum</div>
                                  <div className="text-sm font-bold text-white">{checkResult.finalDate}</div>
                                </div>
                                <div className="text-center border-l border-white/10">
                                  <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Neue Uhrzeit</div>
                                  <div className="text-sm font-bold text-white">{checkResult.finalTime}</div>
                                </div>
                              </div>

                              {checkResult.statusLog?.filter(l => l.status === 'Verschoben').pop()?.notes && (
                                <div className="text-center px-4">
                                  <p className="text-[10px] text-slate-400 italic">"{checkResult.statusLog.filter(l => l.status === 'Verschoben').pop()?.notes}"</p>
                                </div>
                              )}

                              <div className="flex gap-4">
                                <button 
                                  onClick={() => handleCitizenAppointmentResponse(false)}
                                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10"
                                >
                                  Ablehnen
                                </button>
                                <button 
                                  onClick={() => handleCitizenAppointmentResponse(true)}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
                                >
                                  Annehmen
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ihr Anliegen</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">{checkResult.reason}</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => { setCheckResult(null); setCheckCode(''); }}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
                        >
                          Anderen Termin prüfen
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                  <div className="flex flex-col h-full overflow-hidden">
                    {appStep === 'Selection' && (
                       <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                        <div className="text-center space-y-4">
                          <h2 className="text-5xl font-black text-white uppercase tracking-tighter">Karriere<span className="text-emerald-500">portal</span></h2>
                          <p className="text-slate-400 text-[10px] uppercase tracking-[0.4em] font-black">Ihre Zukunft bei der Bundespolizei</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <button onClick={() => { setCareerPath('Mittlerer Dienst'); setAppStep('Info'); }} className="bg-slate-800/40 border border-white/5 p-10 rounded-[48px] text-left hover:border-emerald-500/50 hover:bg-emerald-600/5 transition-all group shadow-2xl">
                              <div className="w-16 h-16 bg-emerald-600/10 text-emerald-500 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-emerald-600/20 group-hover:scale-110 transition-transform">👮‍♂️</div>
                              <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Mittlerer <span className="text-emerald-500">Dienst</span></h3>
                              <p className="text-slate-400 text-[11px] leading-relaxed uppercase font-bold tracking-widest mb-6">Einstieg in den operativen Polizeidienst. Vielseitig, spannend und nah am Bürger.</p>
                              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pt-6 border-t border-white/5">Details ansehen ➔</div>
                           </button>
                           <button onClick={() => { setCareerPath('Gehobener Dienst'); setAppStep('Info'); }} className="bg-slate-800/40 border border-white/5 p-10 rounded-[48px] text-left hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-all group shadow-2xl">
                              <div className="w-16 h-16 bg-indigo-600/10 text-indigo-500 rounded-3xl flex items-center justify-center text-3xl mb-8 border border-indigo-600/20 group-hover:scale-110 transition-transform">🎓</div>
                              <h3 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Gehobener <span className="text-indigo-500">Dienst</span></h3>
                              <p className="text-slate-400 text-[11px] leading-relaxed uppercase font-bold tracking-widest mb-6">Führungsverantwortung übernehmen. Duales Studium mit Bachelor-Abschluss.</p>
                              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pt-6 border-t border-white/5">Details ansehen ➔</div>
                           </button>
                        </div>
                        <div className="pt-12 border-t border-white/5 flex justify-center">
                           <button 
                             type="button"
                             onClick={() => setModalType('StatusCheck')}
                             className="bg-white/5 hover:bg-white/10 text-slate-300 px-12 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 flex items-center gap-4 group"
                           >
                             <span className="text-xl group-hover:rotate-12 transition-transform">🔍</span>
                             Bewerbungsstatus prüfen
                           </button>
                        </div>
                      </div>
                    )}

                    {appStep === 'Info' && (
                      <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-500">
                        <div className="p-10 bg-slate-800/60 border-b border-white/10 flex justify-between items-center shrink-0">
                           <div className="space-y-1">
                              <button type="button" onClick={() => setAppStep('Selection')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-white transition-colors">← Zurück zur Auswahl</button>
                              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
                                Laufbahn: <span className={careerPath === 'Mittlerer Dienst' ? 'text-emerald-500' : 'text-indigo-500'}>{careerPath}</span>
                              </h3>
                           </div>
                           <div className="text-right hidden sm:block">
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</div>
                              <div className="text-emerald-500 font-bold text-xs uppercase bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 tracking-widest">Bewerbungsphase Offen</div>
                           </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <section className="space-y-6">
                                 <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-5 h-0.5 bg-emerald-600"></span> 
                                    Der Bewerbungsablauf
                                 </h4>
                                 <div className="space-y-4">
                                    {[
                                       { step: "01", title: "Online-Bewerbung", desc: "Einreichen Ihrer Unterlagen über dieses Portal." },
                                       { step: "02", title: "Vorauswahl", desc: "Prüfung Ihrer Daten durch unsere Personalabteilung." },
                                       { step: "03", title: "Eignungstest", desc: "Sporttest und persönliches Auswahlgespräch." },
                                       { step: "04", title: "Ärztliche Untersuchung", desc: "Feststellung der Polizeidiensttauglichkeit." },
                                       { step: "05", title: "Einstellung", desc: "Beginn Ihrer Karriere bei der Bundespolizei." }
                                    ].map((item, idx) => (
                                       <div key={idx} className="flex gap-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-black text-xs shrink-0">{item.step}</div>
                                          <div>
                                             <div className="text-sm font-black text-white uppercase tracking-tight">{item.title}</div>
                                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.desc}</div>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </section>

                              <section className="space-y-6">
                                 <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-5 h-0.5 bg-indigo-600"></span> 
                                    {careerPath === 'Mittlerer Dienst' ? 'Ausbildungsübersicht' : 'Studienübersicht'}
                                 </h4>
                                 <div className="bg-black/20 p-8 rounded-[32px] border border-white/5 space-y-8">
                                    <div className="space-y-2">
                                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dauer</div>
                                       <div className="text-xl font-black text-white uppercase">{careerPath === 'Mittlerer Dienst' ? '2,5 Jahre Ausbildung' : '3 Jahre Duales Studium'}</div>
                                    </div>
                                    <div className="space-y-2">
                                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inhalte</div>
                                       <ul className="space-y-3">
                                          {(careerPath === 'Mittlerer Dienst' ? 
                                             ['Einsatztraining & Selbstverteidigung', 'Waffenausbildung & Schießtraining', 'Rechtskunde & Kriminalistik', 'Praktika in Dienststellen'] :
                                             ['Führungslehre & Management', 'Staats- & Verwaltungsrecht', 'Psychologie & Ethik', 'Einsatzmanagement & Taktik']
                                          ).map((content, idx) => (
                                             <li key={idx} className="flex items-center gap-3 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                {content}
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                    <div className="pt-6 border-t border-white/5">
                                       <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Abschluss</div>
                                       <div className="text-sm font-black text-emerald-500 uppercase tracking-tighter">
                                          {careerPath === 'Mittlerer Dienst' ? 'Polizeimeister/in (m/w/d)' : 'Bachelor of Arts (B.A.) & Polizeikommissar/in'}
                                       </div>
                                    </div>
                                 </div>
                              </section>
                           </div>
                        </div>

                        <div className="p-10 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-center shrink-0">
                           <button 
                              onClick={() => setAppStep('Form')}
                              className="px-32 py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-emerald-900/30"
                           >
                              Jetzt Bewerben
                           </button>
                        </div>
                      </div>
                    )}

                    {appStep === 'Form' && (
                      <form onSubmit={e => handleSubmission(e, 'Bewerbung')} className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-8 duration-500">
                        <div className="p-10 bg-slate-800/60 border-b border-white/10 flex justify-between items-center shrink-0">
                           <div className="space-y-1">
                              <button type="button" onClick={() => setAppStep('Info')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-white transition-colors">← Zurück zur Info</button>
                              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
                                 Online-<span className="text-emerald-500">Bewerbung</span>
                              </h3>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Laufbahn: {careerPath}</p>
                           </div>
                           <div className="text-right hidden sm:block">
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Übermittlung</div>
                              <div className="text-emerald-500 font-bold text-xs uppercase bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 tracking-widest">Sicher & Verschlüsselt</div>
                           </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                           <section className="space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">01</div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Persönliche Daten</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-black/20 p-8 rounded-[32px] border border-white/5">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Vorname</label>
                                    <input name="firstname" required placeholder="Max" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Nachname</label>
                                    <input name="lastname" required placeholder="Mustermann" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Geschlecht</label>
                                    <select name="gender" required className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all cursor-pointer">
                                       <option value="" className="bg-slate-900">Bitte wählen</option>
                                       <option value="Männlich" className="bg-slate-900">Männlich</option>
                                       <option value="Weiblich" className="bg-slate-900">Weiblich</option>
                                       <option value="Divers" className="bg-slate-900">Divers</option>
                                    </select>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Geburtsdatum</label>
                                    <input name="icBirthDate" type="date" required className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-emerald-500 [color-scheme:dark]" />
                                 </div>
                              </div>
                           </section>

                           <section className="space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">02</div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Erreichbarkeit</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-8 rounded-[32px] border border-white/5">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Discord ID</label>
                                    <input name="discordId" required placeholder="max.mustermann#1234" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Telefonnummer</label>
                                    <input name="icPhone" required placeholder="+49..." className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                              </div>
                           </section>

                           <section className="space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">03</div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Qualifikation</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-8 rounded-[32px] border border-white/5">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Höchster Schulabschluss</label>
                                    <input name="education" required placeholder="z.B. Abitur, Realschulabschluss..." className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Bisherige Erfahrung (RP/Polizei)</label>
                                    <input name="experience" placeholder="Hatten Sie bereits Berührungspunkte?" className="w-full bg-slate-900/50 border border-white/10 p-5 rounded-2xl text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                                 </div>
                              </div>
                           </section>

                           <section className="space-y-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">04</div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Schriftlicher Teil</h4>
                              </div>
                              <div className="space-y-8 bg-black/20 p-8 rounded-[32px] border border-white/5">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Motivation (Warum möchten Sie zu uns?)</label>
                                    <textarea name="motivation" required rows={6} className="w-full bg-slate-900/50 border border-white/10 p-8 rounded-[32px] text-slate-200 text-base leading-relaxed outline-none resize-none focus:border-emerald-500 transition-all custom-scrollbar" placeholder="Beschreiben Sie Ihre Beweggründe..."></textarea>
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Lebenslauf (Ihr bisheriger Werdegang)</label>
                                    <textarea name="cv" required rows={6} className="w-full bg-slate-900/50 border border-white/10 p-8 rounded-[32px] text-slate-200 text-base leading-relaxed outline-none resize-none focus:border-emerald-500 transition-all custom-scrollbar" placeholder="Listen Sie Ihren Werdegang auf..."></textarea>
                                 </div>
                              </div>
                           </section>
                        </div>

                        <div className="p-10 bg-slate-900/80 backdrop-blur-md border-t border-white/10 flex items-center justify-center shrink-0">
                           <button className="px-32 py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-emerald-900/30">
                              Bewerbung jetzt einreichen
                           </button>
                        </div>
                     </form>
                  )}

                  {appStep === 'Success' && (
                     <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-8 animate-in zoom-in duration-500">
                        <div className="w-32 h-32 bg-emerald-500/10 text-emerald-500 rounded-[40px] flex items-center justify-center text-6xl mx-auto border border-emerald-500/20 shadow-2xl shadow-emerald-900/20">✓</div>
                        <div className="space-y-2">
                           <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Bewerbung übermittelt</h2>
                           <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.3em]">Vielen Dank für Ihr Interesse an der Bundespolizei.</p>
                        </div>
                        
                        <div className="bg-black/40 border border-white/10 p-10 rounded-[40px] w-full max-w-md space-y-6 shadow-2xl">
                           <div className="space-y-1">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ihr Tracking-Code</h4>
                              <div className="text-4xl font-black text-emerald-500 tracking-[0.3em] font-mono">{trackingCode}</div>
                           </div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                              Speichern Sie diesen Code sorgfältig ab. Sie benötigen ihn, um den Status Ihrer Bewerbung jederzeit online abzufragen.
                           </p>
                           <button 
                              type="button"
                              onClick={() => {
                                 navigator.clipboard.writeText(trackingCode);
                                 alert("Code in die Zwischenablage kopiert!");
                              }}
                              className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                           >
                              Code kopieren
                           </button>
                        </div>
                        
                        <button 
                           type="button"
                           onClick={() => { setModalType(null); setAppStep('Selection'); }}
                           className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                        >
                           Zurück zur Startseite
                        </button>
                     </div>
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

        <div className="mt-12 flex flex-wrap justify-center gap-6">
           <button 
             onClick={() => { setModalType('TerminBuchung'); setAppStep('Selection'); }}
             className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 transition-all active:scale-95 flex items-center gap-4"
           >
             <span className="text-2xl">📅</span>
             Termin buchen
           </button>
           <button 
             onClick={() => { setModalType('TerminStatus'); setCheckCode(''); setCheckResult(null); }}
             className="bg-white/5 hover:bg-white/10 text-slate-300 px-12 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] border border-white/10 transition-all active:scale-95 flex items-center gap-4"
           >
             <span className="text-2xl">🔍</span>
             Terminstatus prüfen
           </button>
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
