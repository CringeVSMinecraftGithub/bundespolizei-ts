
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataModal from '../components/DataModal';
import { DataTable } from '../components/DataTable';
import { dbCollections, onSnapshot, query, orderBy, addDoc, updateDoc, doc, db } from '../firebase';
import { Warrant, IncidentReport } from '../types';
import { useAuth } from '../App';

const WarrantPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [allReports, setAllReports] = useState<IncidentReport[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDanger, setFilterDanger] = useState('Alle');
  const [filterStatus, setFilterStatus] = useState('Aktiv');
  const [selectedWarrant, setSelectedWarrant] = useState<Warrant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Warrant State
  const [newWarrant, setNewWarrant] = useState<Partial<Warrant>>({ 
    targetName: '', 
    reason: '', 
    dangerLevel: 'Mittel', 
    lastSeen: '',
    age: '',
    height: '',
    weight: '',
    hairColor: '',
    eyeColor: '',
    features: '',
    caseNumber: ''
  });
  
  const [caseSearch, setCaseSearch] = useState('');
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);

  useEffect(() => {
    const unsubWarrants = onSnapshot(query(dbCollections.warrants, orderBy("timestamp", "desc")), (snap) => {
      const ws = snap.docs.map(d => ({ id: d.id, ...d.data() } as Warrant));
      setWarrants(ws);
    });
    const unsubReports = onSnapshot(dbCollections.reports, (snap) => {
      setAllReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport)));
    });
    return () => { unsubWarrants(); unsubReports(); };
  }, []);

  const handleAdd = async () => {
    if (!newWarrant.targetName || !newWarrant.reason) {
      alert("Name und Grund sind Pflichtfelder.");
      return;
    }
    await addDoc(dbCollections.warrants, {
      ...newWarrant,
      active: true,
      timestamp: new Date().toISOString()
    });
    setIsAdding(false);
    setNewWarrant({ 
      targetName: '', reason: '', dangerLevel: 'Mittel', lastSeen: '',
      age: '', height: '', weight: '', hairColor: '', eyeColor: '', features: '', caseNumber: '' 
    });
  };

  const toggleWarrant = async (w: Warrant) => {
    await updateDoc(doc(db, "warrants", w.id), { active: !w.active });
    if (selectedWarrant?.id === w.id) {
      setSelectedWarrant({ ...selectedWarrant, active: !w.active });
    }
  };

  const filteredWarrants = warrants.filter(w => {
    const matchesSearch = w.targetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (w.caseNumber && w.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDanger = filterDanger === 'Alle' || w.dangerLevel === filterDanger;
    const matchesStatus = filterStatus === 'Alle' || (filterStatus === 'Aktiv' ? w.active : !w.active);
    return matchesSearch && matchesDanger && matchesStatus;
  });

  const handleOpenWarrant = (w: Warrant) => {
    setSelectedWarrant(w);
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Name', accessor: (w: Warrant) => <span className="font-bold">{w.targetName}</span> },
    { header: 'Gefahrenstufe', accessor: (w: Warrant) => <span className={`px-2 py-1 rounded text-xs ${w.dangerLevel === 'Extrem' ? 'bg-red-100 text-red-800' : 'bg-slate-100'}`}>{w.dangerLevel}</span> },
    { header: 'Aktenzeichen', accessor: (w: Warrant) => <span className="font-mono text-xs">{w.caseNumber || 'N/A'}</span> },
    { header: 'Status', accessor: (w: Warrant) => <span className={w.active ? 'text-red-600' : 'text-slate-500'}>{w.active ? 'Aktiv' : 'Aufgehoben'}</span> },
    { header: 'Aktion', accessor: (w: Warrant) => <button onClick={() => handleOpenWarrant(w)} className="text-blue-600 hover:underline">Anzeigen</button> }
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-slate-50">
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Fahndungszentrale</h1>
          <div className="flex items-center gap-3">
             <button onClick={() => setFilterStatus('Aktiv')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'Aktiv' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Aktiv</button>
             <button onClick={() => setFilterStatus('Inaktiv')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'Inaktiv' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Aufgehoben</button>
             <button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-xs font-semibold transition-all">+ Ausschreiben</button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Suche nach Name oder Aktenzeichen..." className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500" />
           <select value={filterDanger} onChange={e => setFilterDanger(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none">
              <option value="Alle">Alle Gefahrenstufen</option>
              <option value="Niedrig">Niedrig</option>
              <option value="Mittel">Mittel</option>
              <option value="Hoch">Hoch</option>
              <option value="Extrem">Extrem</option>
           </select>
        </div>

        {/* Full-Width List */}
        <div className="flex-1 overflow-y-auto">
          <DataTable data={filteredWarrants} columns={columns} onRowClick={handleOpenWarrant} />
        </div>

        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedWarrant?.targetName || 'Fahndungsdetails'}
          subtitle={`Gefahrenstufe: ${selectedWarrant?.dangerLevel || 'N/A'}`}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-end gap-4">
                {selectedWarrant && (
                  <button onClick={() => toggleWarrant(selectedWarrant)} className="px-6 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200">
                    {selectedWarrant.active ? 'Ausschreibung aufheben' : 'Re-Aktivieren'}
                  </button>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Schließen
                </button>
            </div>
          }
        >
          {selectedWarrant && (
            <div className="space-y-4">
              <p><strong>Grund:</strong> {selectedWarrant.reason}</p>
              <p><strong>Zuletzt gesehen:</strong> {selectedWarrant.lastSeen}</p>
              <p><strong>Merkmale:</strong> {selectedWarrant.features}</p>
            </div>
          )}
        </DataModal>
      </div>
  );
};

export default WarrantPage;
