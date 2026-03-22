
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbCollections, addDoc } from '../firebase';
import { useAuth } from '../App';

const TEMPLATES: Record<string, { title: string, content: string, icon: string }> = {
  "Standard": { icon: "🚔", title: "Allgemeiner Einsatzbericht", content: "VOR ORT FESTGESTELLT:\n...\n\nGETROFFENE MASSNAHMEN:\n1. ...\n\nERGEBNIS:\n..." },
  "Unfall": { icon: "🚗", title: "Verkehrsunfallaufnahme", content: "BETEILIGTE:\n...\n\nHERGANG:\n...\n\nSCHADEN:\n..." },
  "Gefahr": { icon: "🛡️", title: "Gefahrenabwehr", content: "ANLASS:\n...\n\nMASSNAHME:\n...\n\nERGEBNIS:\nGefahr beseitigt." }
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
    <div className="max-w-5xl mx-auto space-y-6 pb-20 p-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Einsatzbericht</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Dokumentation polizeilicher Maßnahmen</p>
          </div>
          <div className="text-right">
             <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Berichts-Status</div>
             <div className="text-lg font-mono font-bold text-slate-900 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">{reportId}</div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ml-2">Vorlage wählen:</div>
           <div className="flex gap-2 overflow-x-auto pb-1">
              {Object.keys(TEMPLATES).map(t => (
                <button 
                  key={t} 
                  onClick={() => handleTemplateChange(t)}
                  className={`px-4 py-2 border rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${formData.template === t ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          
          {/* Section 01: Basisdaten */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
               <span className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold">01</span>
               <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Basisdaten & Einsatzort</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Einsatztitel / Stichwort</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 transition-all" 
                  placeholder="z.B. Verkehrsunfall mit Personenschaden"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Einsatzort</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 transition-all" 
                  placeholder="Straße / Viertel"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Beginn</label>
                <input type="time" value={formData.incidentTime} onChange={e => setFormData({...formData, incidentTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Ende</label>
                <input type="time" value={formData.incidentEnd} onChange={e => setFormData({...formData, incidentEnd: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none" />
              </div>
            </div>
          </div>

          {/* Section 02: Beteiligte */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
               <span className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold">02</span>
               <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Beteiligte Personen & Fahrzeuge</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Eingesetzte Einheiten</label>
                <input value={formData.involvedUnits} onChange={e => setFormData({...formData, involvedUnits: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500" placeholder="z.B. Adler 10-1..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Beteiligte Beamte</label>
                <input value={formData.involvedOfficers} onChange={e => setFormData({...formData, involvedOfficers: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500" placeholder="Namen oder Dienstnummern..." />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Zeugen / Geschädigte</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 transition-all resize-none h-24" 
                  placeholder="Name, Kontakt, Rolle..."
                  value={formData.witnesses}
                  onChange={e => setFormData({...formData, witnesses: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Section 03: Sachverhalt */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
               <span className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold">03</span>
               <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Detaillierter Sachverhalt</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Schilderung des Einsatzverlaufs</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 p-6 rounded-lg text-sm text-slate-900 leading-relaxed outline-none focus:border-blue-500 transition-all resize-none h-64" 
                  placeholder="Chronologische Schilderung..."
                  value={formData.incidentDetails}
                  onChange={e => setFormData({...formData, incidentDetails: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Getroffene Maßnahmen</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 transition-all resize-none h-24" 
                    placeholder="z.B. Platzverweis, Festnahme..."
                    value={formData.measures}
                    onChange={e => setFormData({...formData, measures: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">Ergebnis / Verbleib</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-lg text-sm text-slate-900 outline-none focus:border-blue-500 transition-all resize-none h-24" 
                    placeholder="z.B. Person entlassen, Fahrzeug abgeschleppt..."
                    value={formData.result}
                    onChange={e => setFormData({...formData, result: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Signature Block */}
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8">
             <div className="space-y-1 text-center md:text-left">
                <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Elektronische Signatur</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">Durch Absenden bestätigen Sie die Richtigkeit der Angaben.</div>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-right">
                   <div className="text-sm font-bold text-slate-900 uppercase">{user?.firstName} {user?.lastName}</div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase">{user?.rank} • {user?.badgeNumber}</div>
                </div>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Übermittlung...' : 'Bericht Einreichen'}
                </button>
             </div>
          </div>

        </form>
      </div>
  );
};

export default IncidentReportPage;
