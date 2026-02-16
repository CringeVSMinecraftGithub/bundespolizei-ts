
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
  MANAGE_LAWS = 'manage_laws'
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
  
  // Metadata
  reportNumber: string;
  date: string;
  time?: string;
  officerName: string;
  officerBadge: string;
  department?: string;

  // Complaint specific
  complaintType?: 'von Amtswegen' | 'einer Privatperson';
  docType?: 'Strafanzeige' | 'Strafantrag';
  applicantFirstName?: string;
  applicantLastName?: string;

  // General data
  location: string;
  zipCode?: string;
  description: string;
  laws: string[]; // Linked law titles/paragraphs
  
  // Lists
  witnesses: Witness[];
  suspects: Suspect[];
  involvedOfficers?: string[];
  evidence?: {
    bodycam?: string;
    files?: string;
  };
  seizedItems?: string[];
}

export interface CitizenSubmission {
  id: string;
  type: 'Hinweis' | 'Strafanzeige' | 'Bürgerservice';
  title: string;
  content: string;
  timestamp: string;
  status: 'Neu' | 'Gelesen' | 'Archiviert';
  subType?: string;
}

export interface JobApplication {
  id: string;
  name: string;
  careerPath: 'Mittlerer Dienst' | 'Gehobener Dienst';
  position: string;
  status: 'Eingegangen' | 'Prüfung' | 'Eingeladen' | 'Abgelehnt';
  timestamp: string;
  email?: string;
  oocAge: string;
  icBirthDate: string;
  icPhone: string;
  discordId: string;
  motivation: string;
  cv: string;
  extraField?: string; // z.B. Abitur-Schnitt für GD
}
