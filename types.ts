
export enum Role {
  GE = 'Direktion GE',
  K = 'Direktion K',
  DGL = 'Dienstgruppenleiter',
  DSL = 'Dienststellenleitung',
  HD = 'Höherer Dienst',
  LS = 'Leitungsstab'
}

export enum Permission {
  VIEW_REPORTS = 'view_reports',
  CREATE_REPORTS = 'create_reports',
  EDIT_REPORTS = 'edit_reports',
  DELETE_REPORTS = 'delete_reports',
  MANAGE_USERS = 'manage_users',
  VIEW_WARRANTS = 'view_warrants',
  MANAGE_WARRANTS = 'manage_warrants',
  ADMIN_ACCESS = 'admin_access',
  MANAGE_LAWS = 'manage_laws',
  MANAGE_FLEET = 'manage_fleet',
  MANAGE_EVIDENCE = 'manage_evidence'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  rank: string;
  badgeNumber: string;
  role: Role;
  isAdmin: boolean;
  permissions: Permission[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: 'Einsatzbereit' | 'Im Einsatz' | 'Defekt';
  lastDriver?: string;
  fuel: number;
}

export interface Evidence {
  id: string;
  caseNumber: string;
  itemName: string;
  description: string;
  seizedBy: string;
  timestamp: string;
  location: string; // z.B. Regal A-01
}

export interface Warrant {
  id: string;
  targetName: string;
  reason: string;
  dangerLevel: 'Niedrig' | 'Mittel' | 'Hoch' | 'Extrem';
  lastSeen: string;
  timestamp: string;
  active: boolean;
}

export interface Law {
  id: string;
  paragraph: string;
  title: string;
  description?: string;
}

export interface Witness {
  firstName: string;
  lastName: string;
  phone: string;
  radio: string;
  statement: string;
}

export interface Suspect {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
  address: string;
  city: string;
  phone: string;
  radio: string;
  job: string;
  idType: string;
}

export interface IncidentReport {
  id: string;
  type: 'Einsatzbericht' | 'Strafanzeige';
  status: 'Offen' | 'In Bearbeitung' | 'Abgeschlossen';
  reportNumber: string;
  date: string;
  officerName: string;
  officerBadge: string;
  location: string;
  description: string;
  applicant?: string;
  suspect?: string;
  violation?: string;
  notes?: string;
  securityLevel?: string;
  timestamp: string;
}

export interface CitizenSubmission {
  id: string;
  type: 'Hinweis' | 'Strafanzeige' | 'Bürgerservice';
  title: string;
  content: string;
  timestamp: string;
  status: 'Neu' | 'Gelesen' | 'Archiviert';
}

// Added properties to match the fields saved in PublicHome.tsx and read in Dashboard.tsx
export interface JobApplication {
  id: string;
  name: string;
  careerPath: 'Mittlerer Dienst' | 'Gehobener Dienst';
  position: string;
  status: 'Eingegangen' | 'Prüfung' | 'Eingeladen' | 'Abgelehnt';
  timestamp: string;
  motivation: string;
  cv: string;
  discordId?: string;
  oocAge?: string;
  icBirthDate?: string;
  icPhone?: string;
  extraField?: string;
}
