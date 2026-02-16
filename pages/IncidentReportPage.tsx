
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc } from '../firebase';
import { useAuth } from '../App';

const TEMPLATES: Record<string, { title: string, content: string }> = {
  "Keine Vorlage": { title: "", content: "" },
  "Standard Einsatz": {
    title: "Allgemeiner Einsatzbericht",
    content: "<b>SACHVERHALT:</b><br>Am [DATUM] um [UHRZEIT] wurde die Streife [RUFNAME] zu folgendem Sachverhalt gerufen:<br><br><b>MAẞNAHMEN:</b><br>Vor Ort wurden folgende polizeiliche Maßnahmen getroffen:<br>1. <br>2. <br><br><b>ERGEBNIS:</b><br>Der Einsatz wurde um [UHRZEIT] mit folgendem Ergebnis beendet:<br>"
  },
  "Widerstand (§ 113 StGB)": {
    title: "Widerstand gegen Vollstreckungsbeamte",
    content: "<b>SACHVERHALT:</b><br>Im Rahmen einer Personenkontrolle leistete die betroffene Person <i>[NAME]</i> aktiven Widerstand.<br><br><b>DETAILS:</b><br>Die Person versuchte durch [BESCHREIBUNG] die Maßnahme zu verhindern. Anwendung von unmittelbarem Zwang war erforderlich.<br><br><b>FOLGEN:</b><br>Verletzte Beamte: [WER]<br>Verletzte Beschuldigte: [WER]<br><br><b>ANZEIGE:</b><br>Strafanzeige gemäß § 113 StGB wurde gefertigt."
  },
  "Verkehrsunfall": {
    title: "Verkehrsunfallaufnahme",
    content: "<b>UNFALLZEIT:</b> [ZEIT]<br><b>UNFALLORT:</b> [ORT]<br><br><b>BETEILIGTE:</b><br>01: [NAME/PKW]<br>02: [NAME/PKW]<br><br><b>HERGANG:</b><br>Fahrzeug 01 befuhr die [STRASSE] und kollidierte mit Fahrzeug 02 beim [MANÖVER].<br><br><b>SCHÄDEN:</b><br>01: [DETAILS]<br>02: [DETAILS]<br><br><b>BEMERKUNG:</b><br>Austausch der Daten erfolgte vor Ort. Verwarnungsgeld wurde [ERHOBEN/NICHT ERHOBEN]."
  }
};

const IncidentReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [reportId, setReportId] = useState('');
  const [involvedUnits, setInvolvedUnits] = useState<string[]>([]);
  const [involvedOfficers, setInvolvedOfficers] = useState<string[]>([]);
  
  const [unitInput, setUnitInput] = useState('');
  const [officerInput, setOfficerInput] = useState('');

  const [reportData, setReportData] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    template: 'Keine Vorlage',
  });

  useEffect(() => {
    const id = `BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`;
    setReportId(id);
  }, []);

  const execCmd = (cmd: string, value: string = '') => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = TEMPLATES[tmplName];
    if (editorRef.current) {
      editorRef.current.innerHTML = tmpl.content;
    }
    setReportData(prev => ({ ...prev, template: tmplName, title: tmpl.title || prev.title }));
  };

  const addUnit = () => {
    if (unitInput.trim() && !involvedUnits.includes(unitInput.trim())) {
      setInvolvedUnits([...involvedUnits, unitInput.trim()]);
      setUnitInput('');
    }
  };

  const addOfficer = () => {
    if (officerInput.trim() && !involvedOfficers.includes(officerInput.trim())) {
      setInvolvedOfficers([...involvedOfficers, officerInput.trim()]);
      setOfficerInput('');
    }
  };

  const removeUnit = (index: number) => {
    setInvolvedUnits(involvedUnits.filter((_, i) => i !== index));
  };

  const removeOfficer = (index: number) => {
    setInvolvedOfficers(involvedOfficers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    
    if (!reportData.title || !content || content === '<br>' || content === '') {
      alert("Bitte geben Sie einen Titel und Berichtsinhalt an.");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: reportId,
        type: 'Einsatzbericht',
        status: 'Offen',
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...reportData,
        involvedOfficers: involvedOfficers.join(', '),
        involvedUnits: involvedUnits.join(', '),
        content: content,
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) {
      console.error(e);
      alert("Kritischer Systemfehler bei der Datenübermittlung.");
    } finally {
      setIsSaving(false);
    }
  };

  const ToolbarButton = ({ icon, cmd, label }: { icon: string, cmd: string, label: string }) => (
    <button 
      onClick={() => execCmd(cmd)}
      className="h-10 w-10 flex items-center justify-center hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
      title={label}
    >
      <span className="font-bold text-lg">{icon}</span>
    </button>
  );

  return (
    <PoliceOSWindow title="Einsatzdokumentation">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
        
        {/* Header & Meta Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter">Protokoll <span className="text-blue-500">Live</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Amtliches Einsatzprotokollsystem V3.0</p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-[#1a1c23] border border-white/5 p-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-xl">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Aktenzeichen</span>
                <span className="text-blue-400 font-mono font-black text-lg mt-1">{reportId}</span>
             </div>
             <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl flex flex-col items-center min-w-[140px] shadow-xl">
                <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Status</span>
                <span className="text-blue-500 font-black text-lg mt-1 uppercase">Offen</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Form Area */}
          <div className="xl:col-span-3 space-y-8">
            <div className="bg-[#1a1c23]/60 backdrop-blur-md border border-white/5 p-8 rounded-[40px] shadow-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Einsatztitel</label>
                  <input type="text" value={reportData.title} onChange={e => setReportData({...reportData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="z.B. Personenkontrolle Bahnhofplatz" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Einsatzort</label>
                  <input type="text" value={reportData.location} onChange={e => setReportData({...reportData, location: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" placeholder="Straße / POI" />
                </div>
              </div>

              {/* Editor Component */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Berichtsinhalt</label>
                   <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
                      <ToolbarButton icon="B" cmd="bold" label="Fett" />
                      <ToolbarButton icon="I" cmd="italic" label="Kursiv" />
                      <ToolbarButton icon="U" cmd="underline" label="Unterstrichen" />
                      <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                      <ToolbarButton icon="•" cmd="insertUnorderedList" label="Liste" />
                      <ToolbarButton icon="1." cmd="insertOrderedList" label="Nummerierung" />
                   </div>
                </div>
                <div 
                  ref={editorRef}
                  contentEditable
                  className="w-full min-h-[450px] bg-black/40 border border-white/10 p-10 rounded-[32px] text-slate-200 text-lg leading-relaxed outline-none focus:border-blue-500/30 transition-all overflow-y-auto custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-[#1a1c23]/80 backdrop-blur-md border border-white/5 p-6 rounded-[32px] shadow-xl space-y-6">
               <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-4">Vorlagen</h3>
               <div className="flex flex-col gap-3">
                  {Object.keys(TEMPLATES).map(t => (
                    <button 
                      key={t}
                      onClick={() => handleTemplateChange(t)}
                      className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${reportData.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-black/30 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
            </div>

            <div className="bg-[#1a1c23]/80 backdrop-blur-md border border-white/5 p-6 rounded-[32px] shadow-xl space-y-6">
               <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-4">Beteiligte</h3>
               
               <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Einheiten</label>
                    <div className="flex gap-2">
                      <input value={unitInput} onChange={e => setUnitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUnit()} placeholder="z.B. Adler 1" className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none" />
                      <button onClick={addUnit} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-xl font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {involvedUnits.map((u, i) => (
                        <span key={i} className="text-[8px] font-black uppercase bg-blue-600/10 border border-blue-600/20 text-blue-500 px-3 py-1 rounded-full flex items-center gap-2">
                          {u} <button onClick={() => removeUnit(i)}>✕</button>
                        </span>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Zusätzliche Beamte</label>
                    <div className="flex gap-2">
                      <input value={officerInput} onChange={e => setOfficerInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOfficer()} placeholder="Name/Nummer" className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white outline-none" />
                      <button onClick={addOfficer} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-xl font-bold">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {involvedOfficers.map((o, i) => (
                        <span key={i} className="text-[8px] font-black uppercase bg-slate-800 border border-white/5 text-slate-400 px-3 py-1 rounded-full flex items-center gap-2">
                          {o} <button onClick={() => removeOfficer(i)}>✕</button>
                        </span>
                      ))}
                    </div>
                 </div>
               </div>
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 p-6 rounded-[32px] space-y-2">
               <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Zuständiger Beamter</h3>
               <div className="text-base font-black text-white uppercase tracking-tighter">{user?.rank} {user?.lastName}</div>
               <div className="text-[10px] text-slate-500 font-bold">{user?.badgeNumber}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors">Abbrechen</button>
          <div className="flex gap-4">
            <button onClick={() => { if(editorRef.current) editorRef.current.innerHTML = ''; }} className="bg-white/5 hover:bg-white/10 text-slate-500 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Editor Leeren</button>
            <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-24 py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">
              {isSaving ? 'Cloud-Speicherung...' : 'Bericht Finalisieren'}
            </button>
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default IncidentReportPage;
