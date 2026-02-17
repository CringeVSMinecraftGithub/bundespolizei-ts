
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
  }
};

const IncidentReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [reportId, setReportId] = useState('');
  const [involvedUnits, setInvolvedUnits] = useState<string[]>([]);
  const [unitInput, setUnitInput] = useState('');
  const [reportData, setReportData] = useState({ title: '', location: '', template: 'Keine Vorlage' });

  useEffect(() => { setReportId(`BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`); }, []);

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = TEMPLATES[tmplName];
    if (editorRef.current) editorRef.current.innerHTML = tmpl.content;
    setReportData(prev => ({ ...prev, template: tmplName, title: tmpl.title || prev.title }));
  };

  const handleSave = async () => {
    if (!user || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    if (!reportData.title || !content) return alert("Fehlende Pflichtangaben.");
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: reportId,
        type: 'Einsatzbericht',
        status: 'Offen',
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...reportData,
        involvedUnits: involvedUnits.join(', '),
        content: content,
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  return (
    <PoliceOSWindow title="Einsatzprotokollierung">
      <div className="max-w-7xl mx-auto flex flex-col gap-10 animate-in fade-in pb-32">
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div className="space-y-3">
            <h1 className="text-6xl font-black text-white uppercase tracking-tighter">Protokoll <span className="text-blue-500">System</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em]">Entzerrte Erfassungsansicht V3.0</p>
          </div>
          <div className="bg-[#1a1c23] p-6 rounded-3xl border border-white/5 text-center min-w-[180px]">
             <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Aktenzeichen</div>
             <div className="text-blue-400 font-mono font-black text-2xl">{reportId}</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-9 space-y-10">
            <div className="bg-[#1a1c23]/60 backdrop-blur-md p-10 rounded-[50px] border border-white/5 shadow-2xl space-y-10">
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Titel</label>
                    <input value={reportData.title} onChange={e => setReportData({...reportData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-6 rounded-3xl text-white font-black text-xl outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Einsatzort</label>
                    <input value={reportData.location} onChange={e => setReportData({...reportData, location: e.target.value})} className="w-full bg-black/40 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-blue-500" />
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Inhalt</label>
                  <div ref={editorRef} contentEditable className="w-full min-h-[600px] bg-black/40 border border-white/10 p-12 rounded-[40px] text-slate-200 text-lg leading-relaxed outline-none focus:border-blue-500/20 transition-all overflow-y-auto custom-scrollbar" />
               </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-8">
            <div className="bg-[#1a1c23] p-8 rounded-[40px] border border-white/5 space-y-8">
               <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-6">Vorlagen</h3>
               <div className="flex flex-col gap-3">
                  {Object.keys(TEMPLATES).map(t => (
                    <button key={t} onClick={() => handleTemplateChange(t)} className={`w-full text-left p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${reportData.template === t ? 'bg-blue-600 text-white' : 'bg-black/40 text-slate-500 hover:text-white'}`}>{t}</button>
                  ))}
               </div>
            </div>

            <div className="bg-[#1a1c23] p-8 rounded-[40px] border border-white/5 space-y-8">
               <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-6">Beteiligte</h3>
               <div className="space-y-6">
                  <input value={unitInput} onChange={e => setUnitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setInvolvedUnits([...involvedUnits, unitInput.trim()])} placeholder="Einheiten hinzufügen..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-xs text-white outline-none" />
                  <div className="flex flex-wrap gap-2">{involvedUnits.map((u, i) => <span key={i} className="bg-blue-600/10 text-blue-500 text-[8px] font-black px-3 py-1 rounded-full">{u}</span>)}</div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest">Abbruch</button>
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white px-32 py-6 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 transition-all">Bericht Validieren & Speichern</button>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default IncidentReportPage;
