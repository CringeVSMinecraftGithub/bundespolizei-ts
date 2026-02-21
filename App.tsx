
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicHome from './pages/PublicHome';
import Dashboard from './pages/Dashboard';
import IncidentReportPage from './pages/IncidentReportPage';
import CriminalComplaintPage from './pages/CriminalComplaintPage';
import AdminPanel from './pages/AdminPanel';
import FleetPage from './pages/FleetPage';
import EvidencePage from './pages/EvidencePage';
import WarrantPage from './pages/WarrantPage';
import CaseSearchPage from './pages/CaseSearchPage';
import ApplicationsPage from './pages/ApplicationsPage';
import TipsPage from './pages/TipsPage';
import CalendarPage from './pages/CalendarPage';
import PressPage from './pages/PressPage';
import OrgChartPage from './pages/OrgChartPage';
import Header from './components/Header';
import Footer from './components/Footer';
import SettingsModal from './components/SettingsModal';
import { User, Permission, UserRole, Law } from './types';
import { DEFAULT_ADMIN } from './constants';
import { db, dbCollections, getDocs, setDoc, doc, updateDoc, onSnapshot, addDoc } from './firebase';

interface AuthContextType {
  user: User | null;
  login: (badgeNumber: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (perm: Permission) => boolean;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  roles: UserRole[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const LEGACY_MAP: Record<string, string> = {
  'view_reports': Permission.VIEW_REPORTS,
  'create_reports': Permission.CREATE_REPORTS,
  'edit_reports': Permission.EDIT_REPORTS,
  'delete_reports': Permission.DELETE_REPORTS,
  'manage_users': Permission.MANAGE_USERS,
  'view_warrants': Permission.VIEW_WARRANTS,
  'manage_warrants': Permission.MANAGE_WARRANTS,
  'admin_access': Permission.ADMIN_ACCESS,
  'manage_laws': Permission.MANAGE_LAWS,
  'manage_fleet': Permission.MANAGE_FLEET,
  'manage_evidence': Permission.MANAGE_EVIDENCE,
  'view_applications': Permission.VIEW_APPLICATIONS,
  'manage_applications': Permission.MANAGE_APPLICATIONS,
  'view_tips': Permission.VIEW_TIPS,
  'manage_tips': Permission.MANAGE_TIPS,
  'view_calendar': Permission.VIEW_CALENDAR,
  'manage_calendar': Permission.MANAGE_CALENDAR,
  'manage_news': Permission.MANAGE_NEWS,
  'manage_org': Permission.MANAGE_ORG
};

const INITIAL_LAWS: Partial<Law>[] = [
  // StGB
  { paragraph: "§ 32", category: "StGB", title: "Notwehr", description: "Rechtfertigung zur Abwehr eines gegenwärtigen rechtswidrigen Angriffs." },
  { paragraph: "§ 34", category: "StGB", title: "Rechtfertigender Notstand", description: "Eingriff zur Gefahrenabwehr bei Güterabwägung." },
  { paragraph: "§ 113", category: "StGB", title: "Widerstand gegen Vollstreckungsbeamte", description: "Gewalt/Drohung gegen Amtsträger bei Vollstreckung." },
  { paragraph: "§ 114", category: "StGB", title: "Tätlicher Angriff auf Vollstreckungsbeamte", description: "Körperlicher Angriff im Dienst." },
  { paragraph: "§ 123", category: "StGB", title: "Hausfriedensbruch", description: "Unbefugtes Eindringen oder Verweilen." },
  { paragraph: "§ 142", category: "StGB", title: "Unerlaubtes Entfernen vom Unfallort", description: "Unfallflucht." },
  { paragraph: "§ 145d", category: "StGB", title: "Vortäuschen einer Straftat", description: "Falsche Strafanzeige." },
  { paragraph: "§ 185", category: "StGB", title: "Beleidigung", description: "Kundgabe der Missachtung." },
  { paragraph: "§ 186", category: "StGB", title: "Üble Nachrede", description: "Nicht erweislich wahre ehrenrührige Behauptung." },
  { paragraph: "§ 187", category: "StGB", title: "Verleumdung", description: "Wissentlich falsche Tatsachenbehauptung." },
  { paragraph: "§ 211", category: "StGB", title: "Mord", description: "Tötung mit Mordmerkmalen." },
  { paragraph: "§ 212", category: "StGB", title: "Totschlag", description: "Vorsätzliche Tötung ohne Mordmerkmale." },
  { paragraph: "§ 223", category: "StGB", title: "Körperverletzung", description: "Misshandlung oder Gesundheitsschädigung." },
  { paragraph: "§ 224", category: "StGB", title: "Gefährliche Körperverletzung", description: "Mit Waffe oder gefährlichem Werkzeug." },
  { paragraph: "§ 226", category: "StGB", title: "Schwere Körperverletzung", description: "Dauerhafte erhebliche Schäden." },
  { paragraph: "§ 229", category: "StGB", title: "Fahrlässige Körperverletzung", description: "Verletzung durch Sorgfaltspflichtverstoß." },
  { paragraph: "§ 240", category: "StGB", title: "Nötigung", description: "Gewalt oder Drohung zur Erzwingung eines Verhaltens." },
  { paragraph: "§ 242", category: "StGB", title: "Diebstahl", description: "Wegnahme fremder beweglicher Sache." },
  { paragraph: "§ 243", category: "StGB", title: "Besonders schwerer Fall des Diebstahls", description: "Regelbeispiele (z. B. Einbruch)." },
  { paragraph: "§ 244", category: "StGB", title: "Diebstahl mit Waffen; Bandendiebstahl", description: "Qualifizierte Form." },
  { paragraph: "§ 249", category: "StGB", title: "Raub", description: "Diebstahl unter Gewalt/Drohung." },
  { paragraph: "§ 250", category: "StGB", title: "Schwerer Raub", description: "Qualifikation (Waffe etc.)." },
  { paragraph: "§ 252", category: "StGB", title: "Räuberischer Diebstahl", description: "Gewalt zur Beutesicherung." },
  { paragraph: "§ 253", category: "StGB", title: "Erpressung", description: "Vermögensschädigung durch Nötigung." },
  { paragraph: "§ 255", category: "StGB", title: "Räuberische Erpressung", description: "Gewalt bei Erpressung." },
  { paragraph: "§ 263", category: "StGB", title: "Betrug", description: "Täuschungsbedingte Vermögensverfügung." },
  { paragraph: "§ 303", category: "StGB", title: "Sachbeschädigung", description: "Beschädigung/Zerstörung fremder Sache." },
  { paragraph: "§ 315b", category: "StGB", title: "Gefährliche Eingriffe in den Straßenverkehr", description: "Manipulation oder Hindernisse." },
  { paragraph: "§ 315c", category: "StGB", title: "Gefährdung des Straßenverkehrs", description: "Grobe Verkehrsverstöße mit Gefährdung." },
  { paragraph: "§ 316", category: "StGB", title: "Trunkenheit im Verkehr", description: "Fahruntüchtigkeit durch Alkohol/Drogen." },
  { paragraph: "§ 323c", category: "StGB", title: "Unterlassene Hilfeleistung", description: "Nichtleisten erforderlicher Hilfe." },
  
  // StPO
  { paragraph: "§ 81a", category: "StPO", title: "Körperliche Untersuchung; Blutentnahme", description: "Entnahme bei Beschuldigten." },
  { paragraph: "§ 94", category: "StPO", title: "Sicherstellung und Beschlagnahme", description: "Beweismittelsicherung." },
  { paragraph: "§ 98", category: "StPO", title: "Beschlagnahmeverfahren", description: "Richterliche Bestätigung." },
  { paragraph: "§ 100a", category: "StPO", title: "Telekommunikationsüberwachung", description: "TKÜ bei schweren Straftaten." },
  { paragraph: "§ 102", category: "StPO", title: "Durchsuchung beim Beschuldigten", description: "Auffinden von Beweismitteln." },
  { paragraph: "§ 103", category: "StPO", title: "Durchsuchung bei anderen Personen", description: "Voraussetzungen bei Dritten." },
  { paragraph: "§ 112", category: "StPO", title: "Untersuchungshaft", description: "Haftgründe (Flucht, Verdunkelung)." },
  { paragraph: "§ 127 Abs. 2", category: "StPO", title: "Vorläufige Festnahme", description: "Polizeiliche Festnahme bei dringendem Tatverdacht." },
  { paragraph: "§ 163b", category: "StPO", title: "Identitätsfeststellung", description: "Feststellung der Personalien." },
  { paragraph: "§ 163c", category: "StPO", title: "Freiheitsentziehung zur Identitätsfeststellung", description: "Kurzfristige Festhaltung." },

  // StVO
  { paragraph: "§ 1", category: "StVO", title: "Grundregeln", description: "Gegenseitige Rücksichtnahme." },
  { paragraph: "§ 3", category: "StVO", title: "Geschwindigkeit", description: "Angepasste Geschwindigkeit." },
  { paragraph: "§ 5", category: "StVO", title: "Überholen", description: "Voraussetzungen und Verbote." },
  { paragraph: "§ 8", category: "StVO", title: "Vorfahrt", description: "Vorfahrtsregelungen." },
  { paragraph: "§ 12", category: "StVO", title: "Halten und Parken", description: "Verbote und Einschränkungen." },
  { paragraph: "§ 23", category: "StVO", title: "Sonstige Pflichten des Fahrzeugführers", description: "Handyverbot etc." },
  { paragraph: "§ 35", category: "StVO", title: "Sonderrechte", description: "Befreiung bei Einsatzfahrten." },
  { paragraph: "§ 38", category: "StVO", title: "Blaues Blinklicht und Einsatzhorn", description: "Wegerecht." },

  // BtMG
  { paragraph: "§ 1", category: "BtMG", title: "Begriffsbestimmungen", description: "Definition Betäubungsmittel." },
  { paragraph: "§ 3", category: "BtMG", title: "Erlaubnis zum Umgang", description: "Genehmigungspflicht." },
  { paragraph: "§ 29", category: "BtMG", title: "Unerlaubter Besitz/Handel", description: "Grundtatbestand." },
  { paragraph: "§ 29a", category: "BtMG", title: "Besonders schwerer Fall", description: "Nicht geringe Menge etc." },
  { paragraph: "§ 30", category: "BtMG", title: "Unerlaubte Einfuhr", description: "Qualifikation." },
  { paragraph: "§ 30a", category: "BtMG", title: "Bewaffnetes Handeltreiben", description: "Schwerer Qualifikationstatbestand." },
  { paragraph: "§ 31a", category: "BtMG", title: "Absehen von Verfolgung", description: "Geringe Menge Eigenverbrauch." },

  // WaffG
  { paragraph: "§ 1", category: "WaffG", title: "Begriffsbestimmungen", description: "Definition Waffen/Munition." },
  { paragraph: "§ 2", category: "WaffG", title: "Umgang mit Waffen", description: "Erlaubnispflicht." },
  { paragraph: "§ 10", category: "WaffG", title: "Erteilung von Erlaubnissen", description: "WBK/Waffenschein." },
  { paragraph: "§ 12", category: "WaffG", title: "Ausnahmen von Erlaubnispflichten", description: "Transport etc." },
  { paragraph: "§ 42", category: "WaffG", title: "Verbot bei öffentlichen Veranstaltungen", description: "Führungsverbot." },
  { paragraph: "§ 42a", category: "WaffG", title: "Verbot des Führens bestimmter Waffen", description: "Anscheinswaffen etc." },
  { paragraph: "§ 52", category: "WaffG", title: "Strafvorschriften", description: "Straftatbestände." },
  { paragraph: "§ 53", category: "WaffG", title: "Bußgeldvorschriften", description: "Ordnungswidrigkeiten." },

  // OWiG
  { paragraph: "§ 1", category: "OWiG", title: "Begriff der Ordnungswidrigkeit", description: "Rechtswidrige vorwerfbare Handlung." },
  { paragraph: "§ 17", category: "OWiG", title: "Höhe der Geldbuße", description: "Bemessung." },
  { paragraph: "§ 24", category: "OWiG", title: "Verkehrsordnungswidrigkeiten", description: "Grundlage für Verkehrs-OWi." },
  { paragraph: "§ 47", category: "OWiG", title: "Opportunitätsprinzip", description: "Einstellungsmöglichkeit." },
  { paragraph: "§ 49", category: "OWiG", title: "Bußgeldvorschriften", description: "Verweisnorm." },
  { paragraph: "§ 53", category: "OWiG", title: "Zuständigkeit", description: "Verwaltungsbehörde zuständig." }
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isPublicHome = location.pathname === '/';
  
  if (isPublicHome) return <>{children}</>;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f172a] overflow-hidden">
      {user && <Header />}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
      {user && <Footer />}
      <SettingsModal />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('bpol_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    const unsubRoles = onSnapshot(dbCollections.roles, (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRole)));
    });

    const initDatabase = async () => {
      try {
        const rolesSnap = await getDocs(dbCollections.roles);
        if (rolesSnap.empty) {
          const defaultRoles: UserRole[] = [
            { id: 'LS', name: 'Leitungsstab', isSpecial: false, permissions: Object.values(Permission) },
            { id: 'HD', name: 'Höherer Dienst', isSpecial: false, permissions: Object.values(Permission).filter(p => p !== Permission.ADMIN_ACCESS) },
            { id: 'DSL', name: 'Dienststellenleitung', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.VIEW_APPLICATIONS, Permission.VIEW_TIPS, Permission.VIEW_CALENDAR] },
            { id: 'DGL', name: 'Dienstgruppenleitung', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.VIEW_TIPS, Permission.VIEW_CALENDAR] },
            { id: 'DIR_K', name: 'Direktion K', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.MANAGE_WARRANTS, Permission.VIEW_TIPS, Permission.MANAGE_TIPS, Permission.MANAGE_EVIDENCE] },
            { id: 'DIR_GE', name: 'Direktion GE', isSpecial: false, permissions: [Permission.VIEW_REPORTS, Permission.CREATE_REPORTS, Permission.VIEW_WARRANTS, Permission.VIEW_CALENDAR] },
            { id: 'PR', name: 'Presseabteilung', isSpecial: true, permissions: [Permission.MANAGE_NEWS] }
          ];
          for (const r of defaultRoles) {
            await setDoc(doc(db, "roles", r.id), r);
          }
        }

        const lawsSnap = await getDocs(dbCollections.laws);
        if (lawsSnap.empty) {
          for (const law of INITIAL_LAWS) {
            await addDoc(dbCollections.laws, law);
          }
        }

        const userSnap = await getDocs(dbCollections.users);
        const allUsers = userSnap.docs.map(d => d.data() as User);
        const adminExists = allUsers.some(u => u.badgeNumber === DEFAULT_ADMIN.badgeNumber);
        if (!adminExists) {
          await setDoc(doc(db, "users", DEFAULT_ADMIN.id), {
             ...DEFAULT_ADMIN,
             role: 'LS',
             specialRoles: []
          });
        }
      } catch (e) {
        console.error("Firebase Init Error:", e);
      }
    };
    initDatabase();

    return () => unsubRoles();
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
        if (!found.password && password) {
          await updateDoc(doc(db, "users", found.id), { password });
          setUser({ ...found, password });
          return true;
        }
        if (found.password === password) {
          setUser(found);
          return true;
        }
      }
    } catch (e) { console.error("Login Error:", e); }
    return false;
  };

  const hasPermission = (perm: Permission) => {
    if (!user) return false;
    if (user.isAdmin) return true;
    
    const userRoleIds = [user.role, ...(user.specialRoles || [])];
    const assignedRoles = roles.filter(r => userRoleIds.includes(r.id));
    
    const rawPerms = [
      ...(user.permissions || []),
      ...assignedRoles.flatMap(r => r.permissions || [])
    ];
    
    const normalizedPerms = new Set(rawPerms.map(p => LEGACY_MAP[p] || p));
    
    return normalizedPerms.has(perm);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout: () => setUser(null), hasPermission, isSettingsOpen, setSettingsOpen, roles }}>
      <Router>
        <AppLayout>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              <Route path="/incident-report" element={user && hasPermission(Permission.VIEW_REPORTS) ? <IncidentReportPage /> : <Navigate to="/dashboard" />} />
              <Route path="/criminal-complaint" element={user && hasPermission(Permission.CREATE_REPORTS) ? <CriminalComplaintPage /> : <Navigate to="/dashboard" />} />
              <Route path="/fleet" element={user && hasPermission(Permission.MANAGE_FLEET) ? <FleetPage /> : <Navigate to="/dashboard" />} />
              <Route path="/evidence" element={user && hasPermission(Permission.MANAGE_EVIDENCE) ? <EvidencePage /> : <Navigate to="/dashboard" />} />
              <Route path="/warrants" element={user && hasPermission(Permission.VIEW_WARRANTS) ? <WarrantPage /> : <Navigate to="/dashboard" />} />
              <Route path="/cases" element={user && hasPermission(Permission.VIEW_REPORTS) ? <CaseSearchPage /> : <Navigate to="/dashboard" />} />
              <Route path="/calendar" element={user && hasPermission(Permission.VIEW_CALENDAR) ? <CalendarPage /> : <Navigate to="/dashboard" />} />
              <Route path="/press" element={user && hasPermission(Permission.MANAGE_NEWS) ? <PressPage /> : <Navigate to="/dashboard" />} />
              <Route path="/applications" element={user && hasPermission(Permission.VIEW_APPLICATIONS) ? <ApplicationsPage /> : <Navigate to="/dashboard" />} />
              <Route path="/tips" element={user && hasPermission(Permission.VIEW_TIPS) ? <TipsPage /> : <Navigate to="/dashboard" />} />
              <Route path="/org-chart" element={user ? <OrgChartPage /> : <Navigate to="/" />} />
              <Route path="/admin" element={user?.isAdmin ? <AdminPanel /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </AppLayout>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
