
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import { dbCollections, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, db } from '../firebase';
import { useAuth } from '../App';
import { PressRelease } from '../types';

const PressPage: React.FC = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
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
    setShowSuccess(null);
    setShowConfirmDelete(null);
  };

  const handleNew = () => {
    setSelectedNews(null);
    setFormData({ title: '', content: '', category: 'Einsatz' });
    setShowSuccess(null);
    setShowConfirmDelete(null);
  };

  const triggerDelete = (id: string) => {
    setShowConfirmDelete(id);
  };

  const executeDelete = async () => {
    if (!showConfirmDelete) return;

    try {
      await deleteDoc(doc(db, "news", showConfirmDelete));
      handleNew();
      setShowSuccess("Meldung wurde erfolgreich aus dem System entfernt.");
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Systemfehler beim Löschen der Daten.");
    } finally {
      setShowConfirmDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Titel und Inhalt sind erforderlich.");
      return;
    }

    setIsSaving(true);
    try {
      if (selectedNews) {
        await updateDoc(doc(db, "news", selectedNews.id), {
          ...formData,
          lastEditedBy: `${user.rank} ${user.lastName}`,
          lastEditedAt: new Date().toISOString()
        });
        setShowSuccess("Änderungen wurden erfolgreich gespeichert.");
      } else {
        await addDoc(dbCollections.news, {
          ...formData,
          author: `${user.rank} ${user.lastName}`,
          timestamp: new Date().toISOString()
        });
        setShowSuccess("Die Pressemitteilung wurde veröffentlicht.");
        handleNew();
      }
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Cloud-Synchronisierung fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PoliceOSWindow title="Pressestelle • Meldungsverwaltung">
      <div className="h-full flex flex-col gap-6 overflow-hidden relative">
        
        {/* Header Section */}
        <div className="shrink-0 flex items-center justify-between bg-[#1a1c23]/50 p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center text-2xl">📰</div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Presse <span className="text-indigo-500">Portal</span></h1>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Management-Konsole BTS-PR 3.0</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
          >
            + Neue Meldung erstellen
          </button>
        </div>

        {/* Custom Confirmation Overlay (Replaces Browser Popup) */}
        {showConfirmDelete && (
          <div className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-200">
            <div className="bg-[#1a1c23] border border-red-500/30 p-10 rounded-[40px] w-full max-w-md shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto border border-red-500/20 mb-6">🗑️</div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Meldung löschen?</h3>
                  <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest leading-relaxed">Diese Aktion kann nicht rückgängig gemacht werden. Der Bericht wird permanent aus dem öffentlichen Archiv entfernt.</p>
               </div>
               <div className="flex gap-4 mt-10">
                  <button onClick={() => setShowConfirmDelete(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Abbrechen</button>
                  <button onClick={executeDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20 transition-all active:scale-95">Definitiv Löschen</button>
               </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          
          {/* List Panel */}
          <div className="w-96 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Archivierte Berichte ({news.length})</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {news.map(n => (
                <button 
                  key={n.id} 
                  onClick={() => handleSelect(n)}
                  className={`w-full text-left p-5 border rounded-3xl transition-all group relative overflow-hidden ${selectedNews?.id === n.id ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg' : 'bg-[#1a1c23]/40 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-mono text-slate-600">{new Date(n.timestamp).toLocaleDateString('de-DE')}</span>
                    <span className="text-[7px] font-black bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded uppercase">{n.category}</span>
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">{n.title}</div>
                  <div className="text-[8px] font-bold text-slate-500 mt-2 uppercase tracking-widest italic truncate">Verfasser: {n.author}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 min-w-0">
            <div className="h-full flex flex-col bg-[#1a1c23]/80 rounded-[40px] border border-white/5 overflow-hidden animate-in slide-in-from-right-4 duration-500 shadow-2xl relative">
              
              {/* Success Banner */}
              {showSuccess && (
                <div className="absolute top-0 inset-x-0 z-[100] animate-in slide-in-from-top-full duration-500 pointer-events-none">
                  <div className="bg-emerald-600 text-white py-4 px-10 flex items-center justify-center gap-4 shadow-2xl border-b border-white/10">
                    <span className="text-xl">✓</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{showSuccess}</span>
                  </div>
                </div>
              )}

              {/* Editor Header */}
              <div className="p-10 border-b border-white/10 flex justify-between items-center shrink-0">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                      {selectedNews ? 'Beitrag editieren' : 'Neue Meldung'}
                    </h2>
                    <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">
                      Berechtigungsebene: Presseabteilung (PR)
                    </p>
                 </div>
                 {selectedNews && (
                   <button 
                    type="button"
                    onClick={() => triggerDelete(selectedNews.id)}
                    className="w-14 h-14 bg-red-600/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90 cursor-pointer group"
                    title="Diesen Bericht löschen"
                   >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                   </button>
                 )}
              </div>

              {/* Form Content */}
              <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Titel der Schlagzeile</label>
                      <input 
                        value={formData.title} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 p-6 rounded-[28px] text-white font-black text-lg outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800" 
                        placeholder="ÜBERSCHRIFT EINGEBEN..." 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Ressort</label>
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value as any})} 
                        className="w-full bg-black/40 border border-white/10 p-6 rounded-[28px] text-white font-black text-sm outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                      >
                         <option className="bg-slate-900" value="Einsatz">Einsatzgeschehen</option>
                         <option className="bg-slate-900" value="Personal">Personalien</option>
                         <option className="bg-slate-900" value="Allgemein">Allgemeine Information</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Inhalt der Meldung</label>
                    <textarea 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      rows={12} 
                      className="w-full bg-black/40 border border-white/10 p-8 rounded-[40px] text-slate-200 text-base leading-relaxed outline-none focus:border-indigo-500/30 transition-all resize-none custom-scrollbar shadow-inner" 
                      placeholder="Geben Sie hier den detaillierten Berichtstext ein..."
                      required
                    ></textarea>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="p-10 border-t border-white/10 bg-black/20 flex justify-between items-center shrink-0">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status: Bereit zur Übermittlung</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Gateway: PR-TS-CLOUD-3.0</span>
                   </div>
                   <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={handleNew}
                        className="px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-white transition-all active:scale-95"
                      >
                        Abbrechen
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-20 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSaving ? 'Verarbeitung...' : selectedNews ? 'Änderungen publizieren' : 'Meldung veröffentlichen'}
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
