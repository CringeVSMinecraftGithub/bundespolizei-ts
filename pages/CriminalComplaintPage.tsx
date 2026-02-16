
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy } from '../firebase';
import { useAuth } from '../App';
import { Law } from '../types';

const TEMPLATES: Record<string, { title: string, content: string, law?: string }> = {
  "Leere Vorlage": { title: "", content: "" },
  "Diebstahl (§ 242 StGB)": { 
    title: "Einfacher Diebstahl", 
    content: "TATZEIT: [DATUM/UHRZEIT]\nTATORT: [GENAUER ORT]\n\nSACHVERHALT:\nDer Geschädigte [NAME] meldete den Diebstahl von [GEGENSTAND]. Nach eigenen Angaben wurde der Gegenstand entwendet, während [SITUATION].\n\nBEUTEWERT: ca. [WERT] €\nSICHERUNGSMASSNAHMEN: [WAR GESICHERT/NICHT GESICHERT]\n\nVERDÄCHTIGE MOMENTE:\n[KAMERA/ZEUGEN/SPUREN]",
    law: "§ 242 StGB"
  },
  "Körperverletzung (§ 223 StGB)": { 
    title: "Körperverletzung", 
    content: "TATZEIT: [DATUM/UHRZEIT]\nTATORT: [ORT]\n\nHERGANG:\nEs kam zu einer körperlichen Auseinandersetzung zwischen [PERSON A] und [PERSON B]. Laut Zeugenaussagen schlug [TÄTER] mit [GEGENSTAND/FAUST] gegen [KÖRPERTEIL] des Opfers.\n\nVERLETZUNGSBILD:\n[WUNDEN/PRELLUNGEN/BRÜCHE]\n\nERSTE HILFE:\n[RETTUNGSDIENST/SELBSTSTÄNDIG/NICHT ERF.]",
    law: "§ 223 StGB"
  },
  "Hausfriedensbruch (§ 123 StGB)": { 
    title: "Hausfriedensbruch", 
    content: "TATZEIT: [ZEITRAUM]\nTATORT: [OBJEKTADRESSE]\n\nSACHVERHALT:\nDie Person [NAME] betrat unberechtigt das Grundstück/Gebäude. Trotz mehrmaliger Aufforderung durch den Berechtigten [EIGENTÜMER], das Objekt zu verlassen, verblieb die Person vor Ort.\n\nPOLIZEILICHE MASSNAHMEN:\n[PLATZVERWEIS/GEWAHRSAM]",
    law: "§ 123 StGB"
  },
  "Beleidigung (§ 185 StGB)": {
    title: "Beleidigung",
    content: "TATZEIT: [DATUM/UHRZEIT]\nTATORT: [ORT]\n\nSACHVERHALT:\nDer Beschuldigte [NAME] äußerte gegenüber dem Geschädigten [NAME] folgende Worte: \"[ZITAT]\"\nDie Äußerung erfolgte [ÖFFENTLICH/VOR ZEUGEN].\n\nZEUGEN:\n[NAME/KONTAKT]",
    law: "§ 185 StGB"
  }
};

const CriminalComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [laws, setLaws] = useState<Law[]>([]);
  const [lawSearch, setLawSearch] = useState('');
  const [showLawDropdown, setShowLawDropdown] = useState(false);

  const [formData, setFormData] = useState({
    applicant: '',
    suspect: '',
    suspectDescription: '',
    status: 'Unbearbeitet',
    securityLevel: '0',
    violation: '',
    incidentDetails: '',
    notes: '',
    template: 'Leere Vorlage'
  });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.laws, orderBy("paragraph", "asc")), (snap) => {
      setLaws(snap.docs.map(d => ({ id: d.id, ...d.data() } as Law)));
    });
    return unsub;
  }, []);

  const generateReportId = () => `BTS-${Math.floor(100000 + Math.random() * 900000)}-2026`;

  const handleTemplateChange = (tmplName: string) => {
    const tmpl = TEMPLATES[tmplName];
    setFormData(prev => ({
      ...prev,
      template: tmplName,
      violation: tmpl.law || tmpl.title || prev.violation,
      incidentDetails: tmpl.content
    }));
  };

  const selectLaw = (law: Law) => {
    setFormData(prev => ({
      ...prev,
      violation: `${law.paragraph} ${law.title}`
    }));
    setShowLawDropdown(false);
    setLawSearch('');
  };

  const filteredLaws = laws.filter(l => 
    l.paragraph.toLowerCase().includes(lawSearch.toLowerCase()) || 
    l.title.toLowerCase().includes(lawSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!user) return;
    if (!formData.applicant || !formData.violation || !formData.incidentDetails) {
      alert("Bitte füllen Sie mindestens Geschädigter, Delikt und Tatvorgang aus.");
      return;
    }
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
      navigate('/cases');
    } catch (e) {
      console.error(e);
      alert("Fehler bei der Cloud-Übertragung.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PoliceOSWindow title="Strafanzeige Erfassen">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-100 tracking-tighter uppercase">Strafanzeige <span className="text-blue-500">System</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ermittlungsverfahren Einleiten • Cloud-Basis</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-white/5 p-2 rounded-2xl shadow-xl">
             <span className="text-[9px] font-black uppercase text-slate-500 ml-4">Schnellwahl:</span>
             <div className="flex gap-2">
                {Object.keys(TEMPLATES).map(t => (
                  <button 
                    key={t}
                    onClick={() => handleTemplateChange(t)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${formData.template === t ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-black/30 border-white/10 text-slate-500 hover:text-slate-300'}`}
                  >
                    {t.split('(')[0].trim()}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1a1c23]/80 backdrop-blur-md border border-white/5 p-8 rounded-[32px] space-y-6">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-4">Personalien & Beteiligte</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Anzeigender / Geschädigter</label>
                <input value={formData.applicant} onChange={e => setFormData({...formData, applicant: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-blue-500" placeholder="Name, Vorname..." />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Beschuldigter (Name/Alias)</label>
                <input value={formData.suspect} onChange={e => setFormData({...formData, suspect: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-red-500" placeholder="Name oder 'Unbekannt'..." />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Personenbeschreibung / Merkmale</label>
                <textarea value={formData.suspectDescription} onChange={e => setFormData({...formData, suspectDescription: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none resize-none h-24" placeholder="Kleidung, Größe, Tattoos..." />
              </div>
            </div>
          </div>

          <div className="bg-[#1a1c23]/80 backdrop-blur-md border border-white/5 p-8 rounded-[32px] space-y-6 flex flex-col">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-white/5 pb-4">Rechtliche Einordnung</h3>
            
            <div className="space-y-6 flex-1">
              <div className="relative">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Delikt / Verstoß</label>
                <div className="mt-1 flex items-center bg-black/40 border border-white/10 rounded-xl px-4 focus-within:border-blue-500">
                  <span className="text-slate-500">⚖️</span>
                  <input 
                    className="flex-1 bg-transparent p-4 text-sm text-white font-black uppercase outline-none" 
                    placeholder="Suchen nach Paragraphen..." 
                    value={formData.violation || lawSearch}
                    onFocus={() => setShowLawDropdown(true)}
                    onChange={e => {
                      setLawSearch(e.target.value);
                      setFormData({...formData, violation: e.target.value});
                    }}
                  />
                </div>
                {showLawDropdown && lawSearch && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#0f172a] border border-blue-500/30 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredLaws.map(law => (
                      <button key={law.id} onClick={() => selectLaw(law)} className="w-full text-left p-4 hover:bg-blue-600/20 border-b border-white/5 transition-colors">
                        <div className="text-[10px] text-blue-500 font-black">{law.paragraph}</div>
                        <div className="text-xs text-white font-bold">{law.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Status</label>
                    <select className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option className="bg-slate-900">Unbearbeitet</option>
                      <option className="bg-slate-900">In Prüfung</option>
                      <option className="bg-slate-900">Abgeschlossen</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Dringlichkeit</label>
                    <select className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white outline-none" value={formData.securityLevel} onChange={e => setFormData({...formData, securityLevel: e.target.value})}>
                      <option className="bg-slate-900" value="0">Stufe 0 (Normal)</option>
                      <option className="bg-slate-900" value="1">Stufe 1 (Eilt)</option>
                      <option className="bg-slate-900" value="2">Stufe 2 (Kritisch)</option>
                    </select>
                 </div>
              </div>

              <div className="p-6 bg-blue-600/5 border border-blue-600/10 rounded-2xl flex-1">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Beamten-Ident</h4>
                 <div className="text-xl font-black text-white uppercase tracking-tighter">{user?.rank} {user?.lastName}</div>
                 <div className="text-[9px] text-slate-500 font-black tracking-widest mt-1">Dienstnummer: {user?.badgeNumber}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1c23]/80 backdrop-blur-md border border-white/5 p-8 rounded-[40px] space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Tatvorgang & Dokumentation</h3>
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Rechtsverbindliche Schilderung</span>
          </div>
          <textarea className="w-full h-80 bg-black/40 border border-white/10 p-8 rounded-[32px] text-slate-200 text-base leading-relaxed outline-none focus:border-blue-500/50 resize-none custom-scrollbar" placeholder="Schildern Sie hier den detaillierten Ablauf..." value={formData.incidentDetails} onChange={e => setFormData({...formData, incidentDetails: e.target.value})} />
        </div>

        <div className="flex justify-between items-center px-4">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">Vorgang Verwerfen</button>
          <div className="flex gap-4">
            <button onClick={() => setFormData({...formData, incidentDetails: '', applicant: '', suspect: '', violation: ''})} className="bg-white/5 hover:bg-white/10 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Leeren</button>
            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-20 py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40 transition-all active:scale-95 disabled:opacity-50">
              {isSaving ? 'Cloud-Synchronisierung...' : 'Strafanzeige Finalisieren'}
            </button>
          </div>
        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default CriminalComplaintPage;
