
import React from 'react';
import { Permission } from './types';

// Permanenter Link für das Logo (Postimages)
export const POLICE_LOGO_RAW = "https://i.postimg.cc/QtKgbk3m/bpoltssternv1.png"; 

// Aktualisierte Hintergrundbilder mit permanentem Link
export const DASHBOARD_BG = "https://i.postimg.cc/J4XrLyrV/bpolintranethintergrund.jpg"; 
export const BPOL_STATION_BG = "https://i.postimg.cc/J4XrLyrV/bpolintranethintergrund.jpg"; 

export const APP_NAME = "BUNDESPOLIZEI TEAMSTADT";

export const POLICE_RANKS = [
  { name: 'Bundespolizeipräsident', group: 'Höherer Dienst', level: 1, short: 'BPP' },
  { name: 'Bundespolizeivizepräsident', group: 'Höherer Dienst', level: 2, short: 'BPVP' },
  { name: 'Leitender Polizeidirektor B3', group: 'Höherer Dienst', level: 3, short: 'LPD B3' },
  { name: 'Leitender Polizeidirektor B2', group: 'Höherer Dienst', level: 4, short: 'LPD B2' },
  { name: 'Leitender Polizeidirektor', group: 'Höherer Dienst', level: 5, short: 'LPD' },
  { name: 'Polizeidirektor', group: 'Höherer Dienst', level: 6, short: 'PD' },
  { name: 'Polizeioberrat', group: 'Höherer Dienst', level: 7, short: 'POR' },
  { name: 'Polizeirat', group: 'Höherer Dienst', level: 8, short: 'PR' },
  { name: 'Polizeiratanwärter', group: 'Höherer Dienst', level: 9, short: 'PRA' },
  
  { name: 'Erster Polizeihauptkommissar', group: 'Gehobener Dienst', level: 10, short: 'EPHK' },
  { name: 'Polizeihauptkommissar A12', group: 'Gehobener Dienst', level: 11, short: 'PHK A12' },
  { name: 'Polizeihauptkommissar', group: 'Gehobener Dienst', level: 12, short: 'PHK' },
  { name: 'Polizeioberkommissar', group: 'Gehobener Dienst', level: 13, short: 'POK' },
  { name: 'Polizeikommissar', group: 'Gehobener Dienst', level: 14, short: 'PK' },
  { name: 'Polizeikommissaranwärter', group: 'Gehobener Dienst', level: 15, short: 'PKA' },
  
  { name: 'Erster Polizeihauptmeister', group: 'Mittlerer Dienst', level: 16, short: 'EPHM' },
  { name: 'Polizeihauptmeister mit Amtszulage', group: 'Mittlerer Dienst', level: 17, short: 'PHM m.Z.' },
  { name: 'Polizeihauptmeister', group: 'Mittlerer Dienst', level: 18, short: 'PHM' },
  { name: 'Polizeiobermeister', group: 'Mittlerer Dienst', level: 19, short: 'POM' },
  { name: 'Polizeimeister', group: 'Mittlerer Dienst', level: 20, short: 'PM' },
  { name: 'Polizeimeisteranwärter', group: 'Mittlerer Dienst', level: 21, short: 'PMA' },
];

export const DEFAULT_ADMIN: any = {
  id: 'admin-1',
  firstName: 'Thomas',
  lastName: 'Mueller',
  rank: 'Bundespolizeipräsident',
  badgeNumber: 'Adler 51/01',
  role: 'LS',
  isAdmin: true,
  permissions: [
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.EDIT_REPORTS,
    Permission.DELETE_REPORTS,
    Permission.MANAGE_USERS,
    Permission.VIEW_WARRANTS,
    Permission.MANAGE_WARRANTS,
    Permission.ADMIN_ACCESS,
    Permission.VIEW_TIPS,
    Permission.MANAGE_TIPS,
    Permission.VIEW_APPLICATIONS,
    Permission.MANAGE_APPLICATIONS,
    Permission.VIEW_CALENDAR,
    Permission.MANAGE_CALENDAR,
    Permission.MANAGE_NEWS
  ]
};
