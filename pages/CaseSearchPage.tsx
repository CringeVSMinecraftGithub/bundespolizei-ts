import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dbCollections, onSnapshot, query, orderBy, updateDoc, doc, db } from '../firebase';
import { IncidentReport, Permission } from '../types';
import { useAuth } from '../App';

const CaseSearchPage: React.FC = () => {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const [allCases, setAllCases] = useState<IncidentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Alle');
  const [selectedCase, setSelectedCase] = useState<IncidentReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canManage = hasPermission(Permission.MANAGE_REPORTS);

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.reports, orderBy("timestamp", "desc")), (snap) => {
      const cases = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReport));
      setAllCases(cases);
    });
    return unsub;
  }, []);

  const filteredCases = allCases.filter(c => {
    const matchesSearch = 
      c.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.applicant && c.applicant.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'Alle' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Vorgangssuche</h1>
        <div className="flex gap-4">
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Aktenzeichen / Name..." className="border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500 w-64" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-4 py-2 text-xs outline-none focus:border-blue-500">
            <option value="Alle">Alle Status</option>
            <option value="Offen">Offen</option>
            <option value="Abgeschlossen">Abgeschlossen</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">#{c.reportNumber} • {new Date(c.timestamp).toLocaleString('de-DE')}</div>
                <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">{c.title || c.violation}</div>
              </div>
              <button onClick={() => { setSelectedCase(c); setIsModalOpen(true); }} className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">Details</button>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && selectedCase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-10 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-8">Vorgangsdetails: #{selectedCase.reportNumber}</h2>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Status</div>
                        <div className="text-sm font-bold text-slate-900">{selectedCase.status}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Beamter</div>
                        <div className="text-sm font-bold text-slate-900">{selectedCase.officerName}</div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sachverhalt</div>
                    <div className="text-sm text-slate-700 mt-2">{selectedCase.content || selectedCase.incidentDetails}</div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold text-[10px] uppercase tracking-wider">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseSearchPage;
