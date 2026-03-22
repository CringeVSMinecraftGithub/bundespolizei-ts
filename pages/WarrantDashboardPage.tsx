import React, { useState, useMemo } from 'react';
import { Warrant } from '../types';
import { dbCollections, onSnapshot, query, orderBy } from '../firebase';
import { useAuth } from '../App';

const WarrantDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDanger, setFilterDanger] = useState('Alle');
  const [selectedWarrant, setSelectedWarrant] = useState<Warrant | null>(null);

  React.useEffect(() => {
    const unsubWarrants = onSnapshot(query(dbCollections.warrants, orderBy("timestamp", "desc")), (snap) => {
      const ws = snap.docs.map(d => ({ id: d.id, ...d.data() } as Warrant));
      setWarrants(ws);
    });
    return () => unsubWarrants();
  }, []);

  const filteredWarrants = useMemo(() => {
    return warrants.filter(w => {
      const matchesSearch = w.targetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (w.caseNumber && w.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDanger = filterDanger === 'Alle' || w.dangerLevel === filterDanger;
      return matchesSearch && matchesDanger;
    });
  }, [warrants, searchTerm, filterDanger]);

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Left: Search & Filter */}
      <div className="w-1/3 bg-[#1a1c23]/60 p-6 rounded-[24px] border border-white/5 flex flex-col gap-4">
        <h2 className="text-white font-black uppercase tracking-widest text-sm">Suche & Filter</h2>
        <input 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          placeholder="Name oder Aktenzeichen..." 
          className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-red-500" 
        />
        <select value={filterDanger} onChange={e => setFilterDanger(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs outline-none">
          <option value="Alle">Alle Gefahrenstufen</option>
          <option value="Niedrig">Niedrig</option>
          <option value="Mittel">Mittel</option>
          <option value="Hoch">Hoch</option>
          <option value="Extrem">Extrem</option>
        </select>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredWarrants.map(w => (
            <div 
              key={w.id} 
              onClick={() => setSelectedWarrant(w)}
              className={`p-4 mb-2 rounded-xl cursor-pointer transition-all ${selectedWarrant?.id === w.id ? 'bg-red-600/20 border border-red-500/50' : 'bg-black/20 hover:bg-white/5'} ${w.dangerLevel === 'Extrem' ? 'warning' : ''}`}
            >
              <div className="text-white font-bold text-xs">{w.targetName}</div>
              <div className="text-slate-500 text-[10px] uppercase">{w.dangerLevel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main: Display */}
      <div className="flex-1 bg-[#1a1c23]/60 p-8 rounded-[24px] border border-white/5 overflow-y-auto">
        {selectedWarrant ? (
          <div className="space-y-6">
            <h1 className="text-4xl font-black text-white uppercase">{selectedWarrant.targetName}</h1>
            <div className={`p-4 rounded-xl ${selectedWarrant.dangerLevel === 'Extrem' ? 'warning bg-red-950/30' : 'bg-black/40'}`}>
              <p className="text-white"><strong>Grund:</strong> {selectedWarrant.reason}</p>
              <p className="text-white"><strong>Gefahrenstufe:</strong> {selectedWarrant.dangerLevel}</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600 font-black uppercase tracking-widest">
            Keine Fahndung ausgewählt
          </div>
        )}
      </div>
      
      <style>{`
        .warning {
          border: 1px solid #ef4444;
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }
      `}</style>
    </div>
  );
};

export default WarrantDashboardPage;
