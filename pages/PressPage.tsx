
import React, { useState, useEffect } from 'react';
import PoliceOSWindow from '../components/PoliceOSWindow';
import DataModal from '../components/DataModal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setIsModalOpen(true);
    setShowSuccess(null);
    setShowConfirmDelete(null);
  };

  const handleNew = () => {
    setSelectedNews(null);
    setFormData({ title: '', content: '', category: 'Einsatz' });
    setIsModalOpen(true);
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
      setIsModalOpen(false);
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
      }
      setTimeout(() => {
        setShowSuccess(null);
        setIsModalOpen(false);
      }, 1500);
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

        {/* List of Press Releases */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 gap-3">
            {news.map(n => (
              <div 
                key={n.id} 
                className="bg-[#1a1c23]/40 border border-white/5 rounded-[24px] p-6 flex items-center justify-between group hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-indigo-600/10 text-indigo-500 rounded-xl flex items-center justify-center text-xl">📄</div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[7px] font-mono text-slate-600 uppercase tracking-widest">{new Date(n.timestamp).toLocaleString('de-DE')}</span>
                      <span className="text-[7px] font-black bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-widest">{n.category}</span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">{n.title}</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Verfasser: {n.author}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleSelect(n)}
                  className="px-6 py-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Anzeigen
                </button>
              </div>
            ))}
            {news.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <div className="text-6xl mb-4">📭</div>
                <div className="text-xs font-black uppercase tracking-[0.4em]">Keine Meldungen im Archiv</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal for Editor/Viewer */}
        <DataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedNews ? 'Beitrag editieren' : 'Neue Meldung'}
          subtitle="Pressestelle • Autorisierter Zugriff"
          icon="📰"
          footer={
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">Status: Bereit zur Übermittlung</span>
                <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase italic">Gateway: PR-TS-CLOUD-3.0</span>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest text-slate-500 hover:text-white transition-all active:scale-95"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Verarbeitung...' : selectedNews ? 'Änderungen publizieren' : 'Meldung veröffentlichen'}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-8 relative">
            {/* Success Banner inside Modal */}
            {showSuccess && (
              <div className="absolute -top-12 inset-x-0 z-[100] animate-in slide-in-from-top-full duration-500">
                <div className="bg-emerald-600 text-white py-3 px-10 flex items-center justify-center gap-4 shadow-2xl rounded-2xl border border-white/10">
                  <span className="text-sm">✓</span>
                  <span className="text-[9px] font-black uppercase tracking-widest">{showSuccess}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Titel der Schlagzeile</label>
                  <input 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white font-black text-sm outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800" 
                    placeholder="ÜBERSCHRIFT EINGEBEN..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Ressort / Kategorie</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value as any})} 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-white font-black text-[10px] outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                  >
                     <option className="bg-slate-900" value="Einsatz">Einsatzgeschehen</option>
                     <option className="bg-slate-900" value="Personal">Personalien</option>
                     <option className="bg-slate-900" value="Allgemein">Allgemeine Information</option>
                  </select>
                </div>
              </div>
              {selectedNews && (
                <button 
                  type="button"
                  onClick={() => triggerDelete(selectedNews.id)}
                  className="w-12 h-12 bg-red-600/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90 ml-6 mt-6"
                >
                  🗑️
                </button>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Inhalt der Pressemitteilung</label>
              <textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 p-8 rounded-[40px] text-slate-200 text-sm leading-relaxed outline-none focus:border-indigo-500/30 transition-all resize-none custom-scrollbar shadow-inner min-h-[400px]" 
                placeholder="Geben Sie hier den detaillierten Berichtstext ein..."
              ></textarea>
            </div>
          </div>
        </DataModal>

        {/* Delete Confirmation Overlay */}
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-10 animate-in fade-in duration-200">
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

      </div>
    </PoliceOSWindow>
  );
};

export default PressPage;
