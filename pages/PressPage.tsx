
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, db } from '../firebase';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { PressRelease } from '../types';

const PressPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [news, setNews] = useState<PressRelease[]>([]);
  const [selectedNews, setSelectedNews] = useState<PressRelease | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Einsatz' });

  useEffect(() => {
    const unsub = onSnapshot(query(dbCollections.news, orderBy("timestamp", "desc")), (snap) => {
      setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as PressRelease)));
    });
    return unsub;
  }, []);

  const handleSelect = (item: PressRelease) => {
    setSelectedNews(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category
    });
  };

  const handleNew = () => {
    setSelectedNews(null);
    setFormData({ title: '', content: '', category: 'Einsatz' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Meldung wirklich unwiderruflich löschen?")) return;
    try {
      await deleteDoc(doc(db, "news", id));
      if (selectedNews?.id === id) handleNew();
    } catch (e) {
      alert("Fehler beim Löschen.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.title || !formData.content) return alert("Bitte füllen Sie alle Pflichtfelder aus.");

    setIsSaving(true);
    try {
      if (selectedNews) {
        // Update existing
        await updateDoc(doc(db, "news", selectedNews.id), {
          ...formData,
          lastEditedBy: `${user.rank} ${user.lastName}`
        });
      } else {
        // Create new
        await addDoc(dbCollections.news, {
          ...formData,
          author: `${user.rank} ${user.lastName}`,
          timestamp: new Date().toISOString()
        });
      }
      handleNew();
    } catch (e) {
      alert("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PoliceOSWindow title="Pressestelle • Meldungsverwaltung">
      <div className="h-full flex flex-col gap-6 overflow-hidden">
        
        {/* Header Area */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center text-2xl">📰</div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Presse <span className="text-indigo-500">Portal</span></h1>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Öffentlichkeitsarbeit & Berichterstattung</p>
            </div>
          </div>
          <button 
            onClick={handleNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
          >
            + Neue Meldung erstellen
          </button>
        </div>

        {/* Main Content Area: Split View */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* List Side */}
          <div className="w-96 flex flex-col gap-4 shrink-0">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">Veröffentlichte Berichte ({news.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {news.map(n => (
                <button 
                  key={n.id} 
                  onClick={() => handleSelect(n)}
                  className={`w-full text-left p-5 border rounded-3xl transition-all group relative overflow-hidden ${selectedNews?.id === n.id ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-slate-600">{new Date(n.timestamp).toLocaleDateString('de-DE')}</span>
                    <span className="text-[7px] font-black bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded uppercase">{n.category}</span>
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">{n.title}</div>
                  <div className="text-[8px] font-bold text-slate-500 mt-2 uppercase tracking-widest italic truncate">Von: {n.author}</div>
                </button>
              ))}
              {news.length === 0 && (
                <div className="py-20 text-center opacity-20 uppercase font-black text-[10px] tracking-widest">Keine Meldungen vorhanden</div>
              )}
            </div>
          </div>

          {/* Editor Side */}
          <div className="flex-1 min-w-0">
            <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[40px] border border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-500 shadow-2xl">
              
              <div className="p-10 border-b border-white/10 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                      {selectedNews ? 'Meldung bearbeiten' : 'Neue Meldung'}
                    </h2>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">
                      {selectedNews ? `ID: ${selectedNews.id.slice(-6).toUpperCase()}` : 'System-Bereit für Eingabe'}
                    </p>
                 </div>
                 {selectedNews && (
                   <button 
                    onClick={() => handleDelete(selectedNews.id)}
                    className="p-4 bg-red-600/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all group"
                    title="Löschen"
                   >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                   </button>
                 )}
              </div>

              <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Titel der Schlagzeile</label>
                      <input 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 p-6 rounded-[28px] text-white font-black text-lg outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800" 
                        placeholder="ZENTRALE ÜBERSCHRIFT..." 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Kategorie</label>
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value as any})} 
                        className="w-full bg-black/40 border border-white/10 p-6 rounded-[28px] text-white font-black text-sm outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                      >
                         <option className="bg-slate-900" value="Einsatz">Einsatzgeschehen</option>
                         <option className="bg-slate-900" value="Personal">Personalnachrichten</option>
                         <option className="bg-slate-900" value="Allgemein">Allgemeine Presseinfo</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Inhalt der Pressemitteilung</label>
                    <textarea 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      rows={12} 
                      className="w-full bg-black/40 border border-white/10 p-8 rounded-[40px] text-slate-200 text-base leading-relaxed outline-none focus:border-indigo-500/30 transition-all resize-none custom-scrollbar shadow-inner" 
                      placeholder="Führen Sie hier den detaillierten Bericht aus..."
                    ></textarea>
                  </div>
                </div>

                <div className="p-10 border-t border-white/10 bg-black/20 flex justify-between items-center shrink-0">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sicherheitsstatus: Freigegeben</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Presse-Gateway BTS-PR 3.0</span>
                   </div>
                   <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={handleNew}
                        className="px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-white transition-all"
                      >
                        Verwerfen
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-20 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? 'Synchronisierung...' : selectedNews ? 'Änderungen speichern' : 'Jetzt Veröffentlichen'}
                      </button>
                   </div>
                </div>
              </form>

            </div>
          </div>

        </div>
      </div>
    </PoliceOSWindow>
  );
};

export default PressPage;
