import React, { useState, useEffect } from 'react';
import { dbCollections, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, db } from '../firebase';
import { useAuth } from '../App';
import { PressRelease } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const PressPage: React.FC = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      if (selectedNews) {
        await updateDoc(doc(db, "news", selectedNews.id), {
          ...formData,
          lastEditedBy: `${user.rank} ${user.lastName}`,
          lastEditedAt: new Date().toISOString()
        });
      } else {
        await addDoc(dbCollections.news, {
          ...formData,
          author: `${user.rank} ${user.lastName}`,
          timestamp: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Fehler beim Speichern.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Presseportal</h1>
        <button onClick={() => { setSelectedNews(null); setFormData({ title: '', content: '', category: 'Einsatz' }); setIsModalOpen(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
          + Neue Meldung
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-4">
          {news.map(n => (
            <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{new Date(n.timestamp).toLocaleString('de-DE')} • {n.category}</div>
                <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">{n.title}</div>
              </div>
              <button onClick={() => { setSelectedNews(n); setFormData({ title: n.title, content: n.content, category: n.category }); setIsModalOpen(true); }} className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">Bearbeiten</button>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-10 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-8">{selectedNews ? 'Beitrag bearbeiten' : 'Neue Meldung'}</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500" placeholder="Titel" />
              <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full border border-slate-200 rounded-lg p-4 text-sm outline-none focus:border-blue-500 h-64" placeholder="Inhalt" />
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-lg font-bold text-[10px] uppercase tracking-wider">{isSaving ? 'Speichert...' : 'Speichern'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-lg font-bold text-[10px] uppercase tracking-wider">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PressPage;
