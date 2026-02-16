
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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: `ANZ-${Math.floor(Math.random() * 9000) + 1000}`,
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
            <p className="text-[10px] text-slate-500 px-4 italic">Gebe ein Namen ein und wähle aus der untenstehenden liste die Person aus.</p>
            <div className="bg-[#1f2937]/30 p-3 rounded-sm text-[11px] text-slate-400 border border-slate-700/20">Hier stehen die Suchergebnisse .</div>
          </div>
          <div className="space-y-1">
            <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
              <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Täter :</div>
              <input type="text" className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none" placeholder="Gebe ein Namen ein..." value={formData.suspect} onChange={e => setFormData({...formData, suspect: e.target.value})} />
            </div>
            <p className="text-[10px] text-slate-500 px-4 italic">Gebe ein Namen ein und wähle aus der untenstehende liste die Person aus.</p>
            <div className="bg-[#1f2937]/30 p-3 rounded-sm text-[11px] text-slate-400 border border-slate-700/20">Hier stehen die Suchergebnisse oder Täter Unbekannt.</div>
          </div>
        </div>

        <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Täter Beschreibung:</div>
          <textarea className="w-full h-24 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none resize-none" placeholder="Beschreibung des Unbekanten Täters, wen bei Täter 'Täter unbekannt' ausgewählt wurde" value={formData.suspectDescription} onChange={e => setFormData({...formData, suspectDescription: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Bearbeitender Officer</div>
            <div className="w-full bg-transparent px-4 py-3 text-sm text-slate-500 italic">{user ? `${user.rank} ${user.lastName}` : 'CopNet Assistent'}</div>
          </div>
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Status</div>
            <select className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option>Unbearbeitet</option>
              <option>In Prüfung</option>
              <option>Abgeschlossen</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Sicherheitsstufe</div>
            <select className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none appearance-none cursor-pointer" value={formData.securityLevel} onChange={e => setFormData({...formData, securityLevel: e.target.value})}>
              <option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
            </select>
          </div>
          <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
            <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Verstoß gegen:</div>
            <select className="w-full bg-transparent px-4 py-3 text-sm text-slate-200 outline-none appearance-none cursor-pointer" value={formData.violation} onChange={e => setFormData({...formData, violation: e.target.value})}>
              <option>Kein Verstoß</option>
              <option>§ 242 StGB - Diebstahl</option>
              <option>§ 223 StGB - Körperverletzung</option>
              <option>§ 113 StGB - Widerstand</option>
              <option>§ 303 StGB - Sachbeschädigung</option>
            </select>
          </div>
        </div>

        <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Tatvorgang:</div>
          <textarea className="w-full h-32 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none resize-none" placeholder="Beschreibung des Tatvorgangs." value={formData.incidentDetails} onChange={e => setFormData({...formData, incidentDetails: e.target.value})} />
        </div>

        <div className="bg-[#1f2937]/50 border border-slate-700/50 rounded-sm overflow-hidden">
          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-900/50">Notizen:</div>
          <textarea className="w-full h-24 bg-transparent px-4 py-3 text-sm text-slate-200 outline-none resize-none" placeholder="Hier kannst du deine Notizen einarbeiten." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
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
