
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy } from '../firebase';
import { useAuth } from '../App';
import { Law } from '../types';

const TEMPLATES: Record<string, { title: string, content: string, law?: string }> = {
  "Diebstahl": { 
    title: "Einfacher Diebstahl", 
    content: "TATZEIT: ...\nTATORT: ...\nGEGENSTAND: ...\n\nSACHVERHALT:\n...",
    law: "§ 242 StGB"
  },
  "Körperverletzung": { 
    title: "Körperverletzung", 
    content: "TATZEIT: ...\nTATORT: ...\n\nHERGANG:\n...",
    law: "§ 223 StGB"
  },
  "Hausfriedensbruch": { 
    title: "Hausfriedensbruch", 
    content: "TATZEIT: ...\nTATORT: ...\n\nMASSNAHME:\n...",
    law: "§ 123 StGB"
  }
};

const CriminalComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [laws, setLaws] = useState<Law[]>([]);
  const [lawSearch, setLawSearch] = useState('');
  const [showLawDropdown, setShowLawDropdown] = useState(false);

  const [formData, setFormData] = useState({
    applicant: '',
    suspect: '',
    suspectDescription: '',
    witnesses: '',
    location: '',
    incidentTime: '',
    violation: '',
    evidenceList: '',
    propertyValue: '',
    status: 'Unbearbeitet',
    securityLevel: '0',
    incidentDetails: '',
    notes: '',
    template: 'Keine Vorlage'
  });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });
    return unsub;
  }, []);

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = TEMPLATES[tmplName];
    setFormData(prev => ({
      ...prev,
      template: tmplName,
      violation: tmpl.law || prev.violation,
      incidentDetails: tmpl.content
    }));
  };

  const selectLaw = (law: Law) => {
    setFormData(prev => ({ ...prev, violation: `${law.paragraph} ${law.title}` }));
    setShowLawDropdown(false);
    setLawSearch('');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.applicant || !formData.violation || !formData.incidentDetails) {
      alert("Pflichtfelder ausfüllen (Geschädigter, Delikt, Sachverhalt).");
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: `BTS-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Strafanzeige',
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...formData,
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) {
      alert("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PoliceOSWindow title="Strafanzeige • Neuer Vorgang">
      <div className="max-w-4xl mx-auto py-10 animate-in fade-in duration-500 pb-32">
        
        <div className="flex justify-between items-end mb-10 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Strafanzeige <span className="text-blue-500">Erfassen</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ermittlungsdienst Teamstadt</p>
          </div>
          <div className="flex gap-2">
             {Object.keys(TEMPLATES).map(t => (
               <button key={t} onClick={() => handleTemplateChange(t)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${formData.template === t ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>{t}</button>
             ))}
          </div>
        </div>

        <div className="space-y-10">
          
          {/* Sektion 1: Personen */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Beteiligte Personen
            </h2>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Geschädigter / Anzeigender</label>
                  <input value={formData.applicant} onChange={e => setFormData({...formData, applicant: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 font-bold" placeholder="Name, Adresse..." />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Beschuldigter</label>
                  <input value={formData.suspect} onChange={e => setFormData({...formData, suspect: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-red-500" placeholder="Name oder 'Unbekannt'..." />
               </div>
               <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Zeugen / Weitere Beteiligte</label>
                  <textarea value={formData.witnesses} onChange={e => setFormData({...formData, witnesses: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 resize-none" placeholder="Namen und Erreichbarkeit..." />
               </div>
               <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Täterbeschreibung / Merkmale</label>
                  <textarea value={formData.suspectDescription} onChange={e => setFormData({...formData, suspectDescription: e.target.value})} className="w-full h-24 bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 resize-none" placeholder="Größe, Kleidung, Tattoos..." />
               </div>
            </div>
          </section>

          {/* Sektion 2: Tatangaben & Rechtliches */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Tatort, Zeit & Einordnung
            </h2>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Tatort</label>
                    <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="Anschrift / Ort der Tat..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Tatzeit / Zeitraum</label>
                    <input value={formData.incidentTime} onChange={e => setFormData({...formData, incidentTime: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="z.B. 24.12.2025, 20:00 - 22:00 Uhr" />
                  </div>
               </div>
               
               <div className="relative">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Tatbestand / Delikt</label>
                  <input 
                    value={formData.violation} 
                    onFocus={() => setShowLawDropdown(true)}
                    onChange={e => { setFormData({...formData, violation: e.target.value}); setLawSearch(e.target.value); }}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-black uppercase outline-none focus:border-blue-500" 
                    placeholder="Suchen nach Paragraphen..." 
                  />
                  {showLawDropdown && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {laws.filter(l => l.paragraph.includes(lawSearch) || l.title.includes(lawSearch)).map(l => (
                        <button key={l.id} onClick={() => selectLaw(l)} className="w-full text-left p-3 hover:bg-blue-600/20 border-b border-white/5 text-[10px] uppercase font-bold text-slate-300 transition-colors">{l.paragraph} - {l.title}</button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none">
                       <option value="Unbearbeitet">Unbearbeitet</option>
                       <option value="In Prüfung">In Prüfung</option>
                       <option value="Abgeschlossen">Abgeschlossen</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Dringlichkeit</label>
                    <select value={formData.securityLevel} onChange={e => setFormData({...formData, securityLevel: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none">
                       <option value="0">Normal</option>
                       <option value="1">Hoch</option>
                       <option value="2">Kritisch</option>
                    </select>
                  </div>
               </div>
            </div>
          </section>

          {/* Sektion 3: Beweise & Sachwerte */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Beweismittel & Sachwerte
            </h2>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Sichergestellte Beweismittel / Asservaten</label>
                  <textarea value={formData.evidenceList} onChange={e => setFormData({...formData, evidenceList: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500 resize-none" placeholder="z.B. Tatwaffe, DNA-Spuren, Videoaufnahmen..." />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase ml-2">Schadenshöhe / Wert der Beute</label>
                  <input value={formData.propertyValue} onChange={e => setFormData({...formData, propertyValue: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-500" placeholder="z.B. 1.200 € oder 'Diverse elektronische Geräte'" />
               </div>
            </div>
          </section>

          {/* Sektion 4: Dokumentation */}
          <section className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Ausführlicher Sachverhalt
            </h2>
            <div className="bg-[#1a1c23]/60 p-8 rounded-3xl border border-white/5 shadow-xl">
               <textarea value={formData.incidentDetails} onChange={e => setFormData({...formData, incidentDetails: e.target.value})} className="w-full h-80 bg-black/40 border border-white/10 p-6 rounded-2xl text-slate-200 text-base leading-relaxed outline-none focus:border-blue-500 resize-none shadow-inner" placeholder="Detaillierter Tathergang..." />
            </div>
          </section>

          {/* Signatur-Block */}
          <div className="border-t border-white/10 pt-10 mt-10">
             <div className="flex flex-col items-end text-right">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Amtliche Signatur</div>
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

          <div className="flex justify-between items-center pt-8 border-t border-white/5">
             <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Abbrechen</button>
             <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? 'Synchronisierung...' : 'Strafanzeige Absenden'}
             </button>
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CriminalComplaintPage;
