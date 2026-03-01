
import React, { useState, useEffect, useMemo } from 'react';
import { dbCollections, onSnapshot, query, orderBy, where } from '../firebase';
import { Law } from '../types';
import DataModal from '../components/DataModal';

const LawsPage: React.FC = () => {
  const [laws, setLaws] = useState<Law[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Alle');
  const [punishmentFilter, setPunishmentFilter] = useState('Alle');
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We fetch all active laws. In a real large scale app, we would use pagination.
    // For this intranet, a few hundred laws are manageable client-side.
    const q = query(dbCollections.laws, orderBy("paragraph", "asc"));
    
    const unsub = onSnapshot(q, (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
      setLoading(false);
    });

    return unsub;
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(laws.map(l => l.category).filter(Boolean));
    return ['Alle', ...Array.from(cats).sort()];
  }, [laws]);

  const filteredLaws = useMemo(() => {
    return laws.filter(l => {
      const matchesSearch = 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.paragraph.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.punishment || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'Alle' || l.category === categoryFilter;
      
      const matchesPunishment = punishmentFilter === 'Alle' || (
        punishmentFilter === 'Geldstrafe' ? (l.punishment || '').toLowerCase().includes('geld') :
        punishmentFilter === 'Freiheitsstrafe' ? (l.punishment || '').toLowerCase().includes('freiheits') :
        punishmentFilter === 'Intern' ? (l.punishment || '').toLowerCase().includes('intern') : true
      );

      const matchesStatus = l.status !== 'Inaktiv';

      return matchesSearch && matchesCategory && matchesPunishment && matchesStatus;
    });
  }, [laws, searchTerm, categoryFilter, punishmentFilter]);

  const handleOpenDetail = (law: Law) => {
    setSelectedLaw(law);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Header with Search & Filters */}
        <div className="shrink-0 space-y-4 bg-[#1a1c23]/50 p-6 rounded-[32px] border border-white/5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center text-2xl shadow-inner">⚖️</div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Gesetzes <span className="text-blue-500">Datenbank</span></h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Zentrale Einsicht in geltendes Recht & Strafmaße</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Datenstand</div>
              <div className="text-xs font-bold text-blue-500 uppercase">{new Date().toLocaleDateString('de-DE')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative group">
              <input 
                type="text" 
                placeholder="Suchen nach Paragraph, Titel oder Inhalt..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all shadow-inner"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors">🔍</div>
            </div>

            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase text-slate-300 outline-none focus:border-blue-500 cursor-pointer transition-all shadow-inner"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat === 'Alle' ? 'Alle Kategorien' : cat}</option>)}
            </select>

            <select 
              value={punishmentFilter}
              onChange={(e) => setPunishmentFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase text-slate-300 outline-none focus:border-blue-500 cursor-pointer transition-all shadow-inner"
            >
              <option value="Alle">Alle Strafmaße</option>
              <option value="Geldstrafe">Geldstrafe</option>
              <option value="Freiheitsstrafe">Freiheitsstrafe</option>
              <option value="Intern">Intern / Disziplinar</option>
            </select>
          </div>
        </div>

        {/* Laws List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lade Datenbank...</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredLaws.map(law => (
                <div 
                  key={law.id} 
                  onClick={() => handleOpenDetail(law)}
                  className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 hover:border-blue-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center justify-center text-xl font-black text-blue-500 shadow-xl group-hover:scale-110 transition-transform">
                      {law.paragraph.replace('§', '').trim()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[7px] font-black text-blue-500 uppercase tracking-widest">{law.category}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Paragraph {law.paragraph}</span>
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{law.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 max-w-xl">{law.description || 'Keine Beschreibung vorhanden.'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Strafmaß</div>
                      <div className="text-[10px] font-black text-slate-300 uppercase truncate max-w-[150px]">{law.punishment || 'N/A'}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      ➔
                    </div>
                  </div>
                </div>
              ))}

              {filteredLaws.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <div className="text-6xl mb-4">⚖️</div>
                  <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Gesetze gefunden</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedLaw?.title || 'Gesetzdetails'}
          subtitle={`Paragraph ${selectedLaw?.paragraph} • ${selectedLaw?.category}`}
          icon="⚖️"
          maxWidth="max-w-5xl"
        >
          {selectedLaw && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Kategorie</div>
                  <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedLaw.category}</div>
                </div>
                <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Paragraph</div>
                  <div className="text-[11px] font-bold text-slate-200 uppercase">{selectedLaw.paragraph}</div>
                </div>
                <div className="bg-[#1a1c23]/60 p-5 rounded-2xl border border-white/5 space-y-1 shadow-inner">
                  <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status</div>
                  <div className="text-[11px] font-black text-emerald-500 uppercase">{selectedLaw.status || 'Aktiv'}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-blue-600"></span> 
                  Gesetzestext / Beschreibung
                </h4>
                <div className="bg-[#1a1c23]/40 border border-white/5 p-8 rounded-3xl shadow-inner">
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedLaw.description || 'Kein ausführlicher Text hinterlegt.'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] px-2 flex items-center gap-3">
                  <span className="w-5 h-0.5 bg-red-600"></span> 
                  Strafmaß & Sanktionen
                </h4>
                <div className="bg-red-600/5 border border-red-500/10 p-8 rounded-3xl shadow-inner">
                  <div className="text-red-200 text-sm font-black uppercase tracking-tight leading-relaxed">
                    {selectedLaw.punishment || 'Kein spezifisches Strafmaß definiert.'}
                  </div>
                </div>
              </div>

              {selectedLaw.updatedAt && (
                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-black text-slate-700 uppercase tracking-widest">
                  <span>Letzte Aktualisierung: {new Date(selectedLaw.updatedAt).toLocaleString('de-DE')}</span>
                  <span>BPOL-LAW-DB-v2.4</span>
                </div>
              )}
            </div>
          )}
        </DataModal>
      </div>
  );
};

export default LawsPage;
