
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc } from '../firebase';
import { useAuth } from '../App';

const TEMPLATES: Record<string, { title: string, content: string, icon: string }> = {
  "Standard": {
    icon: "🚔",
    title: "Allgemeiner Einsatzbericht",
    content: "VOR ORT FESTGESTELLT:\n...\n\nGETROFFENE MASSNAHMEN:\n1. ...\n\nERGEBNIS:\n..."
  },
  "Unfall": {
    icon: "🚗",
    title: "Verkehrsunfallaufnahme",
    content: "BETEILIGTE:\n...\n\nHERGANG:\n...\n\nSCHADEN:\n..."
  },
  "Gefahr": {
    icon: "🛡️",
    title: "Gefahrenabwehr",
    content: "ANLASS:\n...\n\nMASSNAHME:\n...\n\nERGEBNIS:\nGefahr beseitigt."
  }
};

const IncidentReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [reportId, setReportId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    incidentTime: '',
    incidentEnd: '',
    involvedOfficers: '',
    involvedUnits: '',
    witnesses: '',
    measures: '',
    result: '',
    incidentDetails: '',
    template: 'Keine Vorlage'
  });

  useEffect(() => { 
    setReportId(`BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`); 
  }, []);

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = TEMPLATES[tmplName];
    if (tmpl) {
      setFormData(prev => ({
        ...prev,
        template: tmplName,
        title: tmpl.title || prev.title,
        incidentDetails: tmpl.content
      }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.title || !formData.incidentDetails || !formData.location) {
      alert("Bitte füllen Sie Titel, Einsatzort und Sachverhalt aus.");
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
        ...formData,
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) { 
      console.error(e); 
      alert("Fehler beim Speichern des Berichts.");
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <PoliceOSWindow title="Einsatzdokumentation • Erfassung">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-white/10 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Einsatz <span className="text-blue-500">Bericht</span></h1>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Dokumentation polizeilicher Maßnahmen</p>
          </div>
          <div className="text-right">
             <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Berichts-Status</div>
             <div className="text-xl font-mono font-black text-blue-400 bg-blue-500/5 px-4 py-2 rounded-lg border border-blue-500/20">{reportId}</div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 flex items-center gap-6 shadow-xl">
           <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap ml-2">Vorlage wählen:</div>
           <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {Object.keys(TEMPLATES).map(t => (
                <button 
                  key={t} 
                  onClick={() => handleTemplateChange(t)}
                  className={`px-4 py-2 border rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${formData.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          
          {/* Section 01: Basisdaten */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 text-xs font-black">01</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Basisdaten & Einsatzort</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Einsatztitel / Stichwort</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-blue-500 transition-all" 
                  placeholder="z.B. Verkehrsunfall mit Personenschaden"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Einsatzort</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-blue-500 transition-all" 
                  placeholder="Straße / Viertel"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Beginn</label>
                <input type="time" value={formData.incidentTime} onChange={e => setFormData({...formData, incidentTime: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Ende</label>
                <input type="time" value={formData.incidentEnd} onChange={e => setFormData({...formData, incidentEnd: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none [color-scheme:dark]" />
              </div>
            </div>
          </div>

          {/* Section 02: Beteiligte */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 text-xs font-black">02</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Beteiligte Personen & Fahrzeuge</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Eingesetzte Einheiten</label>
                <input value={formData.involvedUnits} onChange={e => setFormData({...formData, involvedUnits: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-blue-500" placeholder="z.B. Adler 10-1..." />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Beteiligte Beamte</label>
                <input value={formData.involvedOfficers} onChange={e => setFormData({...formData, involvedOfficers: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-blue-500" placeholder="Namen oder Dienstnummern..." />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Zeugen / Geschädigte</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] text-slate-300 outline-none focus:border-blue-500 transition-all resize-none h-24 font-medium" 
                  placeholder="Name, Kontakt, Rolle..."
                  value={formData.witnesses}
                  onChange={e => setFormData({...formData, witnesses: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section 03: Sachverhalt */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-500 text-xs font-black">03</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Detaillierter Sachverhalt</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Schilderung des Einsatzverlaufs</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 p-6 rounded-[24px] text-[12px] text-slate-200 leading-relaxed outline-none focus:border-blue-500 transition-all resize-none h-64 font-medium shadow-inner" 
                  placeholder="Chronologische Schilderung..."
                  value={formData.incidentDetails}
                  onChange={e => setFormData({...formData, incidentDetails: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Getroffene Maßnahmen</label>
                  <textarea 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] text-slate-300 outline-none focus:border-blue-500 transition-all resize-none h-24 font-medium" 
                    placeholder="z.B. Platzverweis, Festnahme..."
                    value={formData.measures}
                    onChange={e => setFormData({...formData, measures: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Ergebnis / Verbleib</label>
                  <textarea 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] text-slate-300 outline-none focus:border-blue-500 transition-all resize-none h-24 font-medium" 
                    placeholder="z.B. Person entlassen, Fahrzeug abgeschleppt..."
                    value={formData.result}
                    onChange={e => setFormData({...formData, result: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="bg-[#1a1c23]/40 p-8 rounded-[32px] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
             <div className="space-y-2 text-center md:text-left">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">Elektronische Signatur</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Durch Absenden bestätigen Sie die Richtigkeit der Angaben.</div>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-right">
                   <div className="text-[11px] font-black text-white uppercase italic">{user?.firstName} {user?.lastName}</div>
                   <div className="text-[8px] font-bold text-slate-600 uppercase">{user?.rank} • {user?.badgeNumber}</div>
                </div>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Übermittlung...' : 'Bericht Einreichen'}
                </button>
             </div>
          </div>

        </form>
      </div>
    </PoliceOSWindow>
  );
};

export default IncidentReportPage;
