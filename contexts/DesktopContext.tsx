
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Desktop {
  id: string;
  name: string;
}

interface DesktopContextType {
  desktops: Desktop[];
  activeDesktopId: string;
  addDesktop: () => void;
  removeDesktop: (id: string) => void;
  setActiveDesktopId: (id: string) => void;
}

const DesktopContext = createContext<DesktopContextType | null>(null);

export const useDesktops = () => {
  const context = useContext(DesktopContext);
  if (!context) throw new Error("useDesktops must be used within DesktopProvider");
  return context;
};

export const DesktopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [desktops, setDesktops] = useState<Desktop[]>(() => {
    const saved = sessionStorage.getItem('bpol_desktops');
    return saved ? JSON.parse(saved) : [{ id: 'desktop-1', name: 'Desktop 1' }];
  });
  
  const [activeDesktopId, setActiveDesktopId] = useState(() => {
    const saved = sessionStorage.getItem('bpol_active_desktop_id');
    return saved || 'desktop-1';
  });

  useEffect(() => {
    sessionStorage.setItem('bpol_desktops', JSON.stringify(desktops));
  }, [desktops]);

  useEffect(() => {
    sessionStorage.setItem('bpol_active_desktop_id', activeDesktopId);
  }, [activeDesktopId]);

  const addDesktop = () => {
    if (desktops.length >= 5) return; // Limit to 5 desktops
    const nextNum = desktops.length + 1;
    const newId = `desktop-${Date.now()}`;
    const newDesktop: Desktop = {
      id: newId,
      name: `Desktop ${nextNum}`
    };
    setDesktops([...desktops, newDesktop]);
    setActiveDesktopId(newId);
  };

  const removeDesktop = (id: string) => {
    if (id === 'desktop-1') return; // Cannot close Desktop 1
    const newDesktops = desktops.filter(d => d.id !== id);
    setDesktops(newDesktops);
    if (activeDesktopId === id) {
      setActiveDesktopId('desktop-1');
    }
  };

  return (
    <DesktopContext.Provider value={{ desktops, activeDesktopId, addDesktop, removeDesktop, setActiveDesktopId }}>
      {children}
    </DesktopContext.Provider>
  );
};
