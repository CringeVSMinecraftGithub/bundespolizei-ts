
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc } from '../firebase';
import { useAuth } from '../App';

const CriminalComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    applicant: '',
    suspect: '',
    suspectDescription: '',
    status: 'Unbearbeitet',
    securityLevel: '0',
    violation: 'Kein Verstoß',
    incidentDetails: '',
    notes: ''
  });

  const generateReportId = () => `BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: generateReportId(),
        type: 'Strafanzeige',
        date: new Date().toISOString(),
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...formData,
        timestamp: new Date().toISOString()
      });
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert("Fehler bei der Cloud-Übertragung.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PoliceOSWindow title="Strafanzeigen">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
        <h1 className="text-5xl font-light text-slate-100 mb-2 tracking-tight">Strafanzeige erstellen</h1>
        <div className="h-[2px] w-full bg-blue-600/50 mb-8"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
              <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Anzeige von :</div>
              <input type="text" className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none" placeholder="Gebe ein Namen ein..." value={formData.applicant} onChange={e => setFormData({...formData, applicant: e.target.value})} />
            </div>
            <p className="text-[10px] text-slate-500 px-4 italic">Gebe ein Namen ein.</p>
          </div>
          <div className="space-y-1">
            <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
              <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Täter :</div>
              <input type="text" className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none" placeholder="Gebe ein Namen ein..." value={formData.suspect} onChange={e => setFormData({...formData, suspect: e.target.value})} />
            </div>
            <p className="text-[10px] text-slate-500 px-4 italic">Gebe ein Namen ein oder 'Täter unbekannt'.</p>
          </div>
        </div>

        <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Täter Beschreibung:</div>
          <textarea className="w-full h-24 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none resize-none" placeholder="Beschreibung des Unbekanten Täters" value={formData.suspectDescription} onChange={e => setFormData({...formData, suspectDescription: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Bearbeitender Beamter</div>
            <div className="w-full bg-transparent px-4 py-3 text-sm text-slate-500 italic">{user ? `${user.rank} ${user.lastName}` : 'System'}</div>
          </div>
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Status</div>
            <select className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option>Unbearbeitet</option>
              <option>In Prüfung</option>
              <option>Abgeschlossen</option>
            </select>
          </div>
        </div>

        <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Tatvorgang:</div>
          <textarea className="w-full h-32 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none resize-none" placeholder="Beschreibung des Tatvorgangs." value={formData.incidentDetails} onChange={e => setFormData({...formData, incidentDetails: e.target.value})} />
        </div>

        <div className="flex items-center justify-between pt-10">
          <button onClick={() => navigate('/dashboard')} className="border border-red-900/50 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white px-8 py-2.5 rounded-sm text-xs font-bold transition-all">Abbrechen</button>
          <button onClick={handleSave} disabled={isSaving} className="border border-emerald-900/50 bg-emerald-950/20 text-emerald-500 hover:bg-emerald-600 hover:text-white px-12 py-2.5 rounded-sm text-xs font-bold transition-all disabled:opacity-50">
            {isSaving ? 'Wird übertragen...' : 'Speichern'}
          </button>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CriminalComplaintPage;
