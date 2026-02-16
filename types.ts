
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
  MANAGE_EVIDENCE = 'manage_evidence',
  VIEW_APPLICATIONS = 'view_applications',
  MANAGE_APPLICATIONS = 'manage_applications',
  VIEW_TIPS = 'view_tips',
  MANAGE_TIPS = 'manage_tips'
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
  password?: string;
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
  location: string;
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

export interface IncidentReport {
  id: string;
  type: 'Einsatzbericht' | 'Strafanzeige';
  status: 'Offen' | 'In Bearbeitung' | 'Abgeschlossen' | 'Unbearbeitet' | 'In Prüfung';
  reportNumber: string;
  date: string;
  officerName: string;
  officerBadge: string;
  location: string;
  description?: string;
  title?: string;
  content?: string;
  involvedOfficers?: string;
  applicant?: string;
  suspect?: string;
  suspectDescription?: string;
  violation?: string;
  incidentDetails?: string;
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
  contactInfo?: string;
}

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
