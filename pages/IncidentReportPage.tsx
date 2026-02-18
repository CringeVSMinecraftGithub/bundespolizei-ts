
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
      <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-500 pb-32">
        
        {/* Header mit Aktenzeichen */}
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Einsatzbericht <span className="text-blue-500">Erstellen</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Status: Erfassung läuft</p>
          </div>
          <div className="text-right">
             <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Aktenzeichen</div>
             <div className="text-xl font-mono font-black text-blue-400 bg-blue-500/5 px-4 py-2 rounded-lg border border-blue-500/20">{reportId}</div>
          </div>
        </div>

        <div className="space-y-12">
          
          {/* 01 Basisdaten */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">01</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Einsatz-Stammdaten</h2>
            </div>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Einsatztitel / Betreff</label>
                    <input 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-all font-bold" 
                      placeholder="Kurzbeschreibung des Vorfalls..." 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Einsatzort</label>
                    <input 
                      value={formData.location} 
                      onChange={e => setFormData({...formData, location: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 transition-all" 
                      placeholder="Ort, Sektor, Gleis..." 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Beginn</label>
                       <input type="time" value={formData.incidentTime} onChange={e => setFormData({...formData, incidentTime: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ende</label>
                       <input type="time" value={formData.incidentEnd} onChange={e => setFormData({...formData, incidentEnd: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none [color-scheme:dark]" />
                    </div>
                 </div>
               </div>
               <div className="pt-4 border-t border-white/5">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-3">Berichtsvorlage wählen (Optional)</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(TEMPLATES).map(t => (
                      <button 
                        key={t}
                        onClick={() => handleTemplateChange(t)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${formData.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                      >
                        {t}
                      </button>
                    ))}
                    <button onClick={() => setFormData({...formData, title: '', incidentDetails: '', template: 'Keine Vorlage'})} className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-500 border border-red-500/20">Leeren</button>
                  </div>
               </div>
            </div>
          </section>

          {/* 02 Beteiligte */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">02</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Beteiligte & Zeugen</h2>
            </div>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Eingesetzte Einheiten</label>
                    <input 
                      value={formData.involvedUnits} 
                      onChange={e => setFormData({...formData, involvedUnits: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
                      placeholder="z.B. Adler 10-1..." 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Beteiligte Beamte</label>
                    <input 
                      value={formData.involvedOfficers} 
                      onChange={e => setFormData({...formData, involvedOfficers: e.target.value})} 
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
                      placeholder="Namen oder Dienstnummern..." 
                    />
                 </div>
                 <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Zeugen / Geschädigte (Vor Ort)</label>
                    <textarea 
                      value={formData.witnesses} 
                      onChange={e => setFormData({...formData, witnesses: e.target.value})} 
                      className="w-full h-20 bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 resize-none" 
                      placeholder="Name, Kontakt, Rolle..." 
                    />
                 </div>
               </div>
            </div>
          </section>

          {/* 03 Operative Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">03</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Maßnahmen & Ergebnis</h2>
            </div>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Getroffene polizeiliche Maßnahmen</label>
                  <input 
                    value={formData.measures} 
                    onChange={e => setFormData({...formData, measures: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" 
                    placeholder="z.B. Identitätsfeststellung, Platzverweis, Durchsuchung..." 
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Einsatzergebnis</label>
                  <input 
                    value={formData.result} 
                    onChange={e => setFormData({...formData, result: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 font-bold" 
                    placeholder="z.B. Person festgenommen, Gefahr beseitigt, Weiterfahrt gestattet..." 
                  />
               </div>
            </div>
          </section>

          {/* 04 Dokumentation */}
          <section className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">04</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Vollständige Schilderung</h2>
            </div>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 shadow-xl">
               <textarea 
                  value={formData.incidentDetails} 
                  onChange={e => setFormData({...formData, incidentDetails: e.target.value})} 
                  className="w-full h-80 bg-black/40 border border-white/10 p-6 rounded-2xl text-slate-200 text-base leading-relaxed outline-none focus:border-blue-500 resize-none custom-scrollbar shadow-inner" 
                  placeholder="Detaillierte Schilderung des Ablaufs..."
               />
               <div className="mt-4 flex justify-end">
                  <span className="text-[9px] font-mono text-slate-600 uppercase">Zeichen: {formData.incidentDetails.length}</span>
               </div>
            </div>
          </section>

          {/* NEU: Signatur-Block */}
          <div className="border-t border-white/10 pt-10 mt-10">
             <div className="flex flex-col items-end text-right">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Digitale Beglaubigung</div>
                <div className="text-xl font-black text-white uppercase tracking-tighter">
                   {user?.firstName} {user?.lastName}
                </div>
                <div className="h-px w-48 bg-blue-600/50 my-2"></div>
                <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest">
                   Dienstgrad: {user?.rank}
                </div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                   Dienstnummer: {user?.badgeNumber}
                </div>
             </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-8 border-t border-white/5">
             <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Vorgang Verwerfen</button>
             <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
             >
                {isSaving ? 'Speichere...' : 'Einsatzbericht Finalisieren'}
             </button>
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default IncidentReportPage;
