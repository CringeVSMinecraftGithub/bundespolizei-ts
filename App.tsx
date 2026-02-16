
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicHome from './pages/PublicHome';
import Dashboard from './pages/Dashboard';
import IncidentReportPage from './pages/IncidentReportPage';
import CriminalComplaintPage from './pages/CriminalComplaintPage';
import AdminPanel from './pages/AdminPanel';
import Header from './components/Header';
import { User, Permission, Role } from './types';
import { DEFAULT_ADMIN } from './constants';
import { db, dbCollections, getDocs, setDoc, doc } from './firebase';

interface AuthContextType {
  user: User | null;
  login: (badgeNumber: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (perm: Permission) => boolean;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden flex flex-col relative">
      {user && !isDashboard && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {!isDashboard && (
        <footer className="bg-slate-900/50 p-2 text-[10px] text-slate-500 flex justify-between px-6 border-t border-slate-800 z-50">
          <div>© 2024 Bundesrepublik Deutschland | Internes Netzwerk</div>
          <div>Dienst: {user ? `${user.rank} ${user.lastName}` : 'Nicht angemeldet'}</div>
        </footer>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bpol_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Firestore Seeding: Stellt sicher, dass Thomas Mueller existiert
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const userSnap = await getDocs(dbCollections.users);
        const allUsers = userSnap.docs.map(d => d.data() as User);
        const adminExists = allUsers.some(u => u.badgeNumber === DEFAULT_ADMIN.badgeNumber);

        if (!adminExists) {
          await setDoc(doc(db, "users", DEFAULT_ADMIN.id), DEFAULT_ADMIN);
          console.log("Admin account (Thomas Mueller) initialized in Firestore.");
        }
      } catch (e) {
        console.error("Firebase Init Error (Check your Firestore Rules!):", e);
      }
    };
    initDatabase();
  }, []);

  useEffect(() => {
    if (user) sessionStorage.setItem('bpol_active_user', JSON.stringify(user));
    else sessionStorage.removeItem('bpol_active_user');
  }, [user]);

  const login = async (badgeNumber: string, password?: string) => {
    try {
      const snap = await getDocs(dbCollections.users);
      const allUsers = snap.docs.map(d => d.data() as User);
      const found = allUsers.find(u => u.badgeNumber.toLowerCase() === badgeNumber.toLowerCase());
      
      if (found) {
        setUser(found);
        return true;
      }
    } catch (e) {
      console.error("Login Error:", e);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setSidebarOpen(false);
  };

  const hasPermission = (perm: Permission) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, isSidebarOpen, setSidebarOpen }}>
      <Router>
        <AppLayout>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              <Route path="/incident-report" element={user ? <IncidentReportPage /> : <Navigate to="/" />} />
              <Route path="/criminal-complaint" element={user ? <CriminalComplaintPage /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </AppLayout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
