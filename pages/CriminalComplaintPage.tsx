
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy } from '../firebase';
import { useAuth } from '../App';
import { Law } from '../types';

const TEMPLATES: Record<string, { title: string, content: string, laws: string[] }> = {
  "Diebstahl": { title: "Einfacher Diebstahl", content: "TATZEIT: ...\nTATORT: ...\nGEGENSTAND: ...\n\nSACHVERHALT:\n...", laws: ["§ 242 StGB"] },
  "Körperverletzung": { title: "Körperverletzung", content: "TATZEIT: ...\nTATORT: ...\n\nHERGANG:\n...", laws: ["§ 223 StGB"] },
  "Hausfriedensbruch": { title: "Hausfriedensbruch", content: "TATZEIT: ...\nTATORT: ...\n\nMASSNAHME:\n...", laws: ["§ 123 StGB"] }
};

const CriminalComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
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
    const unsub = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });

    // Close dropdown on outside click
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
    // Wir lassen das Dropdown evtl. offen oder schließen es - hier schließen wir es für mehr Klarheit
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
    // Bei Templates überschreiben wir die Gesetze mit den Standardwerten des Templates
    setSelectedLawStrings(tmpl.laws.map(lStr => {
      const found = laws.find(law => `${law.paragraph} ${law.category}` === lStr);
      return found ? `${found.paragraph} ${found.category} - ${found.title}` : lStr;
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.applicant || selectedLawStrings.length === 0 || !formData.incidentDetails) { 
      alert("Bitte füllen Sie Geschädigten, mindestens ein Delikt und den Sachverhalt aus."); 
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
        violation: selectedLawStrings.join(', '), // Zusammenführen der Tags
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
    <PoliceOSWindow title="Strafanzeige">
      <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500 pb-32">
        <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Strafanzeige <span className="text-blue-500">Erfassen</span></h1>
          </div>
          <div className="flex gap-2">
             {Object.keys(TEMPLATES).map(t => (
               <button 
                key={t} 
                onClick={() => applyTemplate(t)} 
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
               >
                {t}
               </button>
             ))}
          </div>
        </div>

        <div className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">Personen & Tatort</h2>
            <div className="bg-[#1a1c23]/60 p-6 rounded-[32px] border border-white/5 grid grid-cols-2 gap-4 shadow-xl">
               <input value={formData.applicant} onChange={e => setFormData({...formData, applicant: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none text-xs focus:border-blue-500/50 transition-all" placeholder="Geschädigter" />
               <input value={formData.suspect} onChange={e => setFormData({...formData, suspect: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none text-xs focus:border-blue-500/50 transition-all" placeholder="Beschuldigter" />
               <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none text-xs focus:border-blue-500/50 transition-all" placeholder="Tatort" />
               <input value={formData.incidentTime} onChange={e => setFormData({...formData, incidentTime: e.target.value})} className="bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none text-xs focus:border-blue-500/50 transition-all" placeholder="Tatzeit" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">Delikt & Sachverhalt</h2>
            <div className="bg-[#1a1c23]/60 p-6 rounded-[32px] border border-white/5 space-y-4 shadow-xl">
               
               {/* Selected Laws Tags Area */}
               <div className="flex flex-wrap gap-2 mb-2">
                 {selectedLawStrings.map(lawStr => (
                   <div key={lawStr} className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 rounded-xl animate-in zoom-in duration-200">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-tight">{lawStr}</span>
                      <button 
                        onClick={() => removeLaw(lawStr)}
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 hover:bg-red-500/40 text-blue-400 hover:text-white transition-all text-[10px]"
                      >
                        ✕
                      </button>
                   </div>
                 ))}
               </div>

               <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <input 
                      value={lawSearch} 
                      onFocus={() => setShowLawDropdown(true)}
                      onChange={e => { setLawSearch(e.target.value); setShowLawDropdown(true); }}
                      className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-black uppercase outline-none focus:border-blue-500 text-xs shadow-inner" 
                      placeholder="Gesetzestext suchen und hinzufügen (z.B. 242 StGB)..." 
                    />
                    {lawSearch && <button onClick={() => setLawSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">✕</button>}
                  </div>
                  
                  {showLawDropdown && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#0a0c10] border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-96 overflow-y-auto custom-scrollbar p-2">
                      {sortedCategories.map(cat => (
                        <div key={cat} className="mb-2 last:mb-0">
                          <div className="px-3 py-1 text-[7px] font-black text-blue-500/50 uppercase tracking-widest">{cat}</div>
                          {groupedLaws[cat].map(l => {
                            const isSelected = selectedLawStrings.includes(`${l.paragraph} ${l.category} - ${l.title}`);
                            return (
                              <button 
                                key={l.id} 
                                type="button" 
                                onClick={() => addLaw(l)} 
                                className={`w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center gap-3 group transition-colors ${isSelected ? 'opacity-30 pointer-events-none' : ''}`}
                              >
                                <span className="text-[10px] font-black text-blue-400 font-mono w-14 shrink-0">{l.paragraph}</span>
                                <span className="text-[9px] font-bold text-slate-500 w-10 shrink-0">{l.category}</span>
                                <span className="text-[10px] font-black text-white uppercase truncate flex-1">{l.title}</span>
                                {isSelected && <span className="text-[8px] font-black text-emerald-500 uppercase">Hinzugefügt</span>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      {filteredLaws.length === 0 && (
                        <div className="p-10 text-center text-[9px] font-black text-slate-700 uppercase tracking-widest">Keine Treffer</div>
                      )}
                    </div>
                  )}
               </div>
               
               <textarea 
                value={formData.incidentDetails} 
                onChange={e => setFormData({...formData, incidentDetails: e.target.value})} 
                className="w-full h-64 bg-black/40 border border-white/10 p-6 rounded-2xl text-slate-200 text-sm leading-relaxed outline-none focus:border-blue-500 resize-none shadow-inner custom-scrollbar" 
                placeholder="Detaillierter Tathergang..." 
               />
            </div>
          </section>

          <div className="flex justify-between items-center pt-8 border-t border-white/5">
             <button type="button" onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors">Abbrechen</button>
             <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? 'Verarbeitung...' : 'Strafanzeige Einreichen'}
             </button>
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CriminalComplaintPage;
