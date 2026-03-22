import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Note } from '../types';
import { dbCollections, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const NotesPage: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  useEffect(() => {
    if (!user) return;

    const q = query(dbCollections.notes, where("userId", "==", user.id));

    const unsub = onSnapshot(q, (snap) => {
      const notesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
      
      notesData.sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        const dateA = new Date(a[sortBy]).getTime();
        const dateB = new Date(b[sortBy]).getTime();
        return dateB - dateA;
      });

      setNotes(notesData);
      if (!selectedNoteId && notesData.length > 0) setSelectedNoteId(notesData[0].id);
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
    const docRef = await addDoc(dbCollections.notes, newNote);
    setSelectedNoteId(docRef.id);
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    setIsSaving(true);
    const noteRef = doc(dbCollections.notes, id);
    await updateDoc(noteRef, { ...updates, updatedAt: new Date().toISOString() });
    setIsSaving(false);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteDoc(doc(dbCollections.notes, id));
    if (selectedNoteId === id) setSelectedNoteId(notes.find(n => n.id !== id)?.id || null);
  };

  const handleContentChange = (content: string) => {
    if (!selectedNote) return;
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content } : n));
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleUpdateNote(selectedNote.id, { content }), 1000);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="h-full flex bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Notizen</h2>
            <button onClick={handleCreateNote} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
              + Neu
            </button>
          </div>
          <input 
            type="text" 
            placeholder="Suchen..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-xs text-slate-900 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedNoteId(note.id)}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedNoteId === note.id 
                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 uppercase tracking-tight mb-1 truncate">{note.title || 'Unbenannt'}</div>
              <div className="text-[10px] text-slate-500 line-clamp-2">{note.content || 'Kein Inhalt...'}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNote ? (
          <>
            <div className="p-8 border-b border-slate-200 flex justify-between items-center">
              <input 
                type="text"
                value={selectedNote.title}
                onChange={e => handleUpdateNote(selectedNote.id, { title: e.target.value })}
                className="text-lg font-bold text-slate-900 uppercase tracking-tight outline-none w-full"
              />
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isSaving ? 'Speichert...' : 'Gespeichert'}</span>
                <button onClick={() => handleDeleteNote(selectedNote.id)} className="text-slate-400 hover:text-red-600">Löschen</button>
              </div>
            </div>
            <textarea
              value={selectedNote.content}
              onChange={e => handleContentChange(e.target.value)}
              className="flex-1 p-8 text-sm text-slate-700 outline-none resize-none"
              placeholder="Notizinhalt..."
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            Notiz auswählen oder erstellen
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
