
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc } from '../firebase';
import { useAuth } from '../App';

const TEMPLATES: Record<string, string> = {
  "Keine Vorlage": "",
  "Standard Einsatz": "SACHVERHALT:\nAm [DATUM] um [UHRZEIT] wurde die Streife [RUFNAME] zu folgendem Sachverhalt gerufen:\n\nMAẞNAHMEN:\nVor Ort wurden folgende polizeiliche Maßnahmen getroffen:\n1. \n2. \n\nERGEBNIS:\nDer Einsatz wurde um [UHRZEIT] mit folgendem Ergebnis beendet:\n",
  "Widerstand gegen Staatsgewalt": "SACHVERHALT:\nIm Rahmen einer [MAẞNAHME, z.B. Personenkontrolle] leistete die betroffene Person [NAME] aktiven Widerstand.\n\nDETAILS ZUM WIDERSTAND:\nDie Person versuchte durch [BESCHREIBUNG, z.B. Schlagen/Wegstoßen] die Maßnahme zu verhindern.\nAnwendung von unmittelbarem Zwang war: [JA/NEIN]\n\nFOLGEN:\nVerletzte Beamte: [ANZAHL/WER]\nVerletzte Beschuldigte: [ANZAHL/WER]\n\nANZEIGE:\nStrafanzeige gemäß § 113 StGB wurde gefertigt."
};

const IncidentReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [reportData, setReportData] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    involvedOfficers: '',
    content: '',
    template: 'Keine Vorlage',
    sharing: 'Nothing selected',
    securityLevel: '0'
  });

  const generateReportId = () => `BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`;

  const handleTemplateChange = (tmpl: string) => {
    setReportData(prev => ({
      ...prev,
      template: tmpl,
      content: prev.content ? prev.content + "\n\n" + TEMPLATES[tmpl] : TEMPLATES[tmpl]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!reportData.title || !reportData.content) {
      alert("Titel und Inhalt dürfen nicht leer sein.");
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(dbCollections.reports, {
        reportNumber: generateReportId(),
        type: 'Einsatzbericht',
        status: 'Offen',
        officerName: `${user.rank} ${user.lastName}`,
        officerBadge: user.badgeNumber,
        ...reportData,
        timestamp: new Date().toISOString()
      });
      navigate('/cases');
    } catch (e) {
      console.error(e);
      alert("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  const toolbarIcons = [
    { icon: 'B', label: 'Bold' }, { icon: 'I', label: 'Italic' }, { icon: 'U', label: 'Underline' },
    { icon: '🔗', label: 'Link' }, { icon: '🖼️', label: 'Image' }, { icon: '🎥', label: 'Video' },
    { icon: '📅', label: 'Table' }, { icon: '❞', label: 'Quote' },
    { icon: '•', label: 'List' }, { icon: '1.', label: 'NumList' }, { icon: '←', label: 'Indent' }, { icon: '→', label: 'Outdent' }
  ];

  return (
    <PoliceOSWindow title="Einsatzberichte">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
        <h1 className="text-3xl font-semibold text-slate-200 mb-8">Einsatzbericht hinzufügen</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center bg-[#1a1d24] border border-slate-700/50 rounded-sm">
              <span className="px-4 py-2.5 text-[11px] font-medium text-slate-400 border-r border-slate-700/50 w-24">Titel:</span>
              <input type="text" className="flex-1 bg-transparent px-4 py-2 text-xs text-slate-200 outline-none" value={reportData.title} onChange={e => setReportData({...reportData, title: e.target.value})} />
            </div>
            <div className="flex items-center bg-[#1a1d24] border border-slate-700/50 rounded-sm">
              <span className="px-4 py-2.5 text-[11px] font-medium text-slate-400 border-r border-slate-700/50 w-24">Einsatzort:</span>
              <input type="text" className="flex-1 bg-transparent px-4 py-2 text-xs text-slate-200 outline-none" value={reportData.location} onChange={e => setReportData({...reportData, location: e.target.value})} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center bg-[#1a1d24] border border-slate-700/50 rounded-sm">
              <span className="px-4 py-2.5 text-[11px] font-medium text-slate-400 border-r border-slate-700/50 w-24">Datum:</span>
              <input type="datetime-local" className="flex-1 bg-transparent px-4 py-2 text-xs text-slate-200 outline-none [color-scheme:dark]" value={reportData.date} onChange={e => setReportData({...reportData, date: e.target.value})} />
            </div>
            <div className="flex items-center bg-[#1a1d24] border border-slate-700/50 rounded-sm">
              <span className="px-4 py-2.5 text-[11px] font-medium text-slate-400 border-r border-slate-700/50 w-44">Beteiligte Einsatzkräfte:</span>
              <input type="text" className="flex-1 bg-transparent px-4 py-2 text-xs text-slate-200 outline-none" value={reportData.involvedOfficers} onChange={e => setReportData({...reportData, involvedOfficers: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="border border-slate-700/50 rounded-sm bg-[#1a1d24] flex flex-col min-h-[400px]">
          <div className="h-10 border-b border-slate-700/50 flex items-center px-4 gap-1 overflow-x-auto no-scrollbar">
            <select className="bg-transparent text-[10px] text-slate-400 outline-none pr-4" value={reportData.template} onChange={e => handleTemplateChange(e.target.value)}>
              {Object.keys(TEMPLATES).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="w-[1px] h-4 bg-slate-700/50 mx-2"></div>
            {toolbarIcons.map((t, i) => (
              <button key={i} className="w-8 h-8 hover:bg-white/5 flex items-center justify-center text-xs text-slate-400 rounded-sm">{t.icon}</button>
            ))}
          </div>
          <textarea 
            className="flex-1 bg-transparent p-6 text-sm text-slate-300 outline-none resize-none leading-relaxed"
            placeholder="Schreiben Sie hier Ihren Bericht..."
            value={reportData.content}
            onChange={e => setReportData({...reportData, content: e.target.value})}
          />
        </div>

        <div className="flex items-center gap-2 pt-8">
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-800/20 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white px-6 py-2.5 rounded-sm text-xs font-semibold transition-all disabled:opacity-50">
            {isSaving ? 'Wird gespeichert...' : 'Bericht speichern'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white px-6 py-2.5 rounded-sm text-xs font-semibold transition-all">Abbrechen</button>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default IncidentReportPage;
