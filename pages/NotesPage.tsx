
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Note } from '../types';
import { dbCollections, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, orderBy } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const NotesPage: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  useEffect(() => {
    if (!user) return;

    const q = query(
      dbCollections.notes,
      where("userId", "==", user.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const notesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      
      // Client-side sorting to avoid composite index requirement
      notesData.sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        const dateA = new Date(a[sortBy]).getTime();
        const dateB = new Date(b[sortBy]).getTime();
        return dateB - dateA; // Descending for dates
      });

      setNotes(notesData);
      
      // Select first note if none selected and notes exist
      if (!selectedNoteId && notesData.length > 0) {
        setSelectedNoteId(notesData[0].id);
      }
    });

    return () => unsub();
  }, [user, sortBy]);

  const handleCreateNote = async () => {
    if (!user) return;
    const newNote = {
      userId: user.id,
      title: 'Neue Notiz',
      content: '',
      isImportant: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const docRef = await addDoc(dbCollections.notes, newNote);
      setSelectedNoteId(docRef.id);
    } catch (e) {
      console.error("Error creating note:", e);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    setIsSaving(true);
    try {
      const noteRef = doc(dbCollections.notes, id);
      const fullUpdates = { ...updates, updatedAt: new Date().toISOString() };
      await updateDoc(noteRef, fullUpdates);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error updating note:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(dbCollections.notes, id));
      if (selectedNoteId === id) {
        setSelectedNoteId(notes.find(n => n.id !== id)?.id || null);
      }
      setConfirmDeleteId(null);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  const handleContentChange = (content: string) => {
    if (!selectedNote) return;
    
    // Update local state immediately for responsiveness
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content } : n));

    // Clear existing timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    // Set new timer for auto-save
    autoSaveTimer.current = setTimeout(() => {
      handleUpdateNote(selectedNote.id, { content });
    }, 2000);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="h-full flex bg-[#1e293b] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-slate-900/50 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Meine Notizen</h2>
            <button 
              onClick={handleCreateNote}
              className="w-8 h-8 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg transition-all shadow-lg shadow-amber-500/20"
            >
              <span className="text-xl font-black">+</span>
            </button>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Suchen..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-xs text-white outline-none focus:border-amber-500/50 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
            >
              <option value="updatedAt" className="bg-slate-900">Zuletzt bearbeitet</option>
              <option value="createdAt" className="bg-slate-900">Erstellungsdatum</option>
              <option value="title" className="bg-slate-900">Titel</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedNoteId(note.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden ${
                selectedNoteId === note.id 
                ? 'bg-amber-500/10 border border-amber-500/30 shadow-lg' 
                : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              {note.isImportant && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/20 flex items-center justify-center rounded-bl-xl">
                  <span className="text-amber-500 text-[10px]">⭐</span>
                </div>
              )}
              <div className={`text-[10px] font-black uppercase tracking-widest mb-1 truncate ${selectedNoteId === note.id ? 'text-amber-400' : 'text-slate-300'}`}>
                {note.title || 'Unbenannt'}
              </div>
              <div className="text-[9px] text-slate-500 line-clamp-2 leading-relaxed">
                {note.content || 'Kein Inhalt...'}
              </div>
              <div className="mt-3 text-[7px] font-mono text-slate-600 uppercase tracking-widest">
                {new Date(note.updatedAt).toLocaleString('de-DE')}
              </div>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <div className="py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">
              Keine Notizen gefunden
            </div>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative flex flex-col bg-[#fef3c7] overflow-hidden">
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }}></div>
        
        {/* Ring Binding Optic */}
        <div className="absolute left-4 top-0 bottom-0 w-8 flex flex-col justify-around py-8 z-10 pointer-events-none opacity-60">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 border border-slate-500 shadow-inner"></div>
          ))}
        </div>

        {selectedNote ? (
          <div className="flex-1 flex flex-col relative z-20 pl-16 pr-12 py-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <input 
                  type="text"
                  value={selectedNote.title}
                  onChange={e => handleUpdateNote(selectedNote.id, { title: e.target.value })}
                  className="bg-transparent text-4xl font-black text-amber-950 uppercase tracking-tighter outline-none placeholder:opacity-20 w-[500px]"
                  placeholder="TITEL DER NOTIZ"
                />
                <button 
                  onClick={() => handleUpdateNote(selectedNote.id, { isImportant: !selectedNote.isImportant })}
                  className={`text-2xl transition-all hover:scale-125 ${selectedNote.isImportant ? 'grayscale-0' : 'grayscale opacity-20'}`}
                  title="Wichtig markieren"
                >
                  ⭐
                </button>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[9px] font-black text-amber-900/40 uppercase tracking-widest">
                    {isSaving ? 'Speichert...' : lastSaved ? `Gespeichert um ${lastSaved}` : 'Bereit'}
                  </div>
                  <div className="text-[7px] font-mono text-amber-900/30 uppercase tracking-widest mt-1">
                    ID: {selectedNote.id.slice(0, 8)}
                  </div>
                </div>

                <div className="relative">
                  <AnimatePresence mode="wait">
                    {confirmDeleteId === selectedNote.id ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className="flex items-center gap-2 bg-red-600 p-1.5 rounded-2xl shadow-xl border border-red-500"
                      >
                        <span className="text-[8px] font-black text-white uppercase tracking-widest px-2">Löschen?</span>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                          Nein
                        </button>
                        <button 
                          onClick={() => handleDeleteNote(selectedNote.id)}
                          className="bg-white text-red-600 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                        >
                          Ja
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setConfirmDeleteId(selectedNote.id)}
                        className="w-12 h-12 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl border border-red-500/20 transition-all group"
                        title="Löschen"
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">🗑️</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              {/* Lines */}
              <div className="absolute inset-0 pointer-events-none" style={{ 
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #d97706 31px, #d97706 32px)',
                backgroundPosition: '0 8px'
              }}></div>
              
              <textarea
                value={selectedNote.content}
                onChange={e => handleContentChange(e.target.value)}
                className="w-full h-full bg-transparent text-amber-950 text-xl leading-[32px] outline-none resize-none relative z-10 font-medium placeholder:opacity-10 custom-scrollbar"
                placeholder="Schreiben Sie hier Ihre Gedanken auf..."
                style={{ fontFamily: '"Inter", sans-serif' }}
              ></textarea>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
            <div className="text-9xl mb-8">📝</div>
            <h2 className="text-4xl font-black text-amber-950 uppercase tracking-tighter">Wählen Sie eine Notiz aus</h2>
            <p className="text-sm font-bold text-amber-900 uppercase tracking-widest mt-4">Oder erstellen Sie eine neue, um zu beginnen</p>
            <button 
              onClick={handleCreateNote}
              className="mt-10 bg-amber-950 text-amber-100 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              Neue Notiz erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
