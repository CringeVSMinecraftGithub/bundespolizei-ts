
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy } from '../firebase';
import { useAuth } from '../App';
import { Law } from '../types';

const TEMPLATES: Record<string, { title: string, content: string, laws: string[] }> = {
  "Diebstahl": { title: "Einfacher Diebstahl", content: "GEGENSTAND:\n...\n\nSACHVERHALT:\nDer Beschuldigte entwendete am Tatort den oben genannten Gegenstand...", laws: ["§ 242 StGB"] },
  "Körperverletzung": { title: "Körperverletzung", content: "HERGANG:\nEs kam zu einer körperlichen Auseinandersetzung zwischen dem Beschuldigten und dem Geschädigten...", laws: ["§ 223 StGB"] },
  "Hausfriedensbruch": { title: "Hausfriedensbruch", content: "SACHVERHALT:\nTrotz ausgesprochenem Hausverbot betrat die Person das befriedete Besitztum...", laws: ["§ 123 StGB"] }
};

const CriminalComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [reportId, setReportId] = useState('');
  const [laws, setLaws] = useState<Law[]>([]);
  const [lawSearch, setLawSearch] = useState('');
  const [showLawDropdown, setShowLawDropdown] = useState(false);
  const [selectedLawStrings, setSelectedLawStrings] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    applicant: '', 
    suspect: '', 
    suspectDescription: '', 
    witnesses: '', 
    location: '', 
    incidentTime: '', 
    evidenceList: '', 
    propertyValue: '', 
    status: 'Unbearbeitet', 
    securityLevel: '0', 
    incidentDetails: '', 
    notes: '', 
    template: 'Keine Vorlage'
  });

  useEffect(() => {
    setReportId(`ANZ-${Math.floor(100000 + Math.random() * 900000)}-2026`);
    const unsub = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLawDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsub();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addLaw = (law: Law) => {
    const lawStr = `${law.paragraph} ${law.category} - ${law.title}`;
    if (!selectedLawStrings.includes(lawStr)) {
      setSelectedLawStrings([...selectedLawStrings, lawStr]);
    }
    setLawSearch('');
    setShowLawDropdown(false);
  };

  const removeLaw = (lawStr: string) => {
    setSelectedLawStrings(selectedLawStrings.filter(s => s !== lawStr));
  };

  const applyTemplate = (t: string) => {
    const tmpl = TEMPLATES[t];
    setFormData(p => ({
      ...p, 
      template: t, 
      incidentDetails: tmpl.content
    }));
    setSelectedLawStrings(tmpl.laws.map(lStr => {
      const found = laws.find(law => `${law.paragraph} ${law.category}` === lStr);
      return found ? `${found.paragraph} ${found.category} - ${found.title}` : lStr;
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.applicant || selectedLawStrings.length === 0 || !formData.incidentDetails) { 
      alert("Bitte füllen Sie den Geschädigten, mindestens ein Delikt und den Sachverhalt aus."); 
      return; 
    }
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: reportId,
        type: 'Strafanzeige',
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...formData,
        violation: selectedLawStrings.join(', '),
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) { 
      alert("Fehler beim Speichern."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const filteredLaws = laws.filter(l => 
    l.paragraph.toLowerCase().includes(lawSearch.toLowerCase()) || 
    l.title.toLowerCase().includes(lawSearch.toLowerCase()) ||
    l.category.toLowerCase().includes(lawSearch.toLowerCase())
  );

  const groupedLaws = filteredLaws.reduce((groups: Record<string, Law[]>, law) => {
    const cat = law.category || 'Sonstige';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(law);
    return groups;
  }, {});

  const sortedCategories = Object.keys(groupedLaws).sort();

  return (
    <PoliceOSWindow title="Strafanzeige • Erfassung">
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-white/10 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Straf <span className="text-red-600">Anzeige</span></h1>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Einleitung eines Ermittlungsverfahrens</p>
          </div>
          <div className="text-right">
             <div className="text-[8px] font-black text-slate-600 uppercase mb-1">Vorgangs-Nummer</div>
             <div className="text-xl font-mono font-black text-red-500 bg-red-500/5 px-4 py-2 rounded-lg border border-red-500/20">{reportId}</div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-[#1a1c23]/60 p-4 rounded-2xl border border-white/5 flex items-center gap-6 shadow-xl">
           <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap ml-2">Vorlage wählen:</div>
           <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {Object.keys(TEMPLATES).map(t => (
                <button 
                  key={t} 
                  onClick={() => applyTemplate(t)}
                  className={`px-4 py-2 border rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${formData.template === t ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          
          {/* Section 01: Beteiligte */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-red-600/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-500 text-xs font-black">01</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Beteiligte Personen</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Anzeigenerstatter / Geschädigter</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-red-500 transition-all" 
                  placeholder="Name, Geburtsdatum, Anschrift..."
                  value={formData.applicant}
                  onChange={e => setFormData({...formData, applicant: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Beschuldigter / Tatverdächtiger</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-red-500 transition-all" 
                  placeholder="Name, Beschreibung, Alias..."
                  value={formData.suspect}
                  onChange={e => setFormData({...formData, suspect: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Zeugen / Auskunftspersonen</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-slate-300 outline-none focus:border-red-500 transition-all resize-none h-16 font-medium" 
                  placeholder="Namen und Erreichbarkeiten..."
                  value={formData.witnesses}
                  onChange={e => setFormData({...formData, witnesses: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section 02: Tatort & Tatzeit */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-red-600/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-500 text-xs font-black">02</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Tatort & Tatzeit</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Tatort</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-red-500 transition-all" 
                  placeholder="Straße, Hausnummer, Sektor..."
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Tatzeit / Zeitraum</label>
                <input 
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[11px] text-white outline-none focus:border-red-500 transition-all" 
                  placeholder="z.B. 12.05. 14:00 - 16:00"
                  value={formData.incidentTime}
                  onChange={e => setFormData({...formData, incidentTime: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 03: Delikte & Sachverhalt */}
          <div className="bg-[#111317] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-[#1a1c23] border-b border-white/10 flex items-center gap-3">
               <span className="w-8 h-8 bg-red-600/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-500 text-xs font-black">03</span>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Delikte & Sachverhalt</h3>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Law Tags */}
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {selectedLawStrings.map(lawStr => (
                  <div key={lawStr} className="flex items-center gap-2 bg-red-600/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-tight">{lawStr}</span>
                    <button type="button" onClick={() => removeLaw(lawStr)} className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px]">✕</button>
                  </div>
                ))}
              </div>

              {/* Law Search */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Strafgesetzbuch (StGB) Suche</label>
                <div className="flex bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-red-500 transition-all">
                  <span className="p-3 text-slate-600">⚖️</span>
                  <input 
                    placeholder="Delikt suchen (z.B. Diebstahl)..." 
                    className="bg-transparent p-3 text-[11px] text-white outline-none flex-1 font-bold uppercase" 
                    value={lawSearch} 
                    onFocus={() => setShowLawDropdown(true)}
                    onChange={e => { setLawSearch(e.target.value); setShowLawDropdown(true); }} 
                  />
                </div>
                {showLawDropdown && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar">
                    {sortedCategories.map(cat => (
                      <div key={cat} className="mb-2">
                        <div className="px-3 py-1 text-[7px] font-black text-red-500/50 uppercase tracking-widest">{cat}</div>
                        {groupedLaws[cat].map(l => (
                          <button 
                            key={l.id} 
                            type="button"
                            onClick={() => addLaw(l)} 
                            className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 flex flex-col gap-1 transition-colors"
                          >
                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">{l.paragraph}</div>
                            <div className="text-[11px] font-bold text-white uppercase">{l.name || l.title}</div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Detaillierte Sachverhaltsschilderung</label>
                <textarea 
                  className="w-full bg-black/40 border border-white/10 p-6 rounded-[24px] text-[12px] text-slate-200 leading-relaxed outline-none focus:border-red-500 transition-all resize-none h-64 font-medium shadow-inner" 
                  placeholder="Chronologische Schilderung der Tat..."
                  value={formData.incidentDetails}
                  onChange={e => setFormData({...formData, incidentDetails: e.target.value})}
                  required
                />
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
                  className="bg-red-700 hover:bg-red-600 text-white px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Übermittlung...' : 'Anzeige Erstatten'}
                </button>
             </div>
          </div>

        </form>
      </div>
    </PoliceOSWindow>
  );
};

export default CriminalComplaintPage;
