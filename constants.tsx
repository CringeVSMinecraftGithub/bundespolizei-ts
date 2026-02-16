
import React from 'react';

// The user provided high-resolution badge image
export const POLICE_LOGO_RAW = "https://cdn.discordapp.com/attachments/1350457418806722601/1472985797169905805/bpoltssternv1.png?ex=6994906c&is=69933eec&hm=fc00974fef8746dba3612e2f377cf7769413925c6dbee8574181d215a65b8c84&"; 

// Dashboard background image (provided by user)
export const DASHBOARD_BG = "https://cdn.discordapp.com/attachments/1350457418806722601/1472985796645486815/bpolintranethintergrund.jpg?ex=6994906c&is=69933eec&hm=193319f090f3b9fbbbddebfce10df28e56c537bc67e7bfc6c6abc60818b9d120&"; // Placeholder for the provided photo structure
export const BPOL_STATION_BG = "https://cdn.discordapp.com/attachments/1350457418806722601/1472985796645486815/bpolintranethintergrund.jpg?ex=6994906c&is=69933eec&hm=193319f090f3b9fbbbddebfce10df28e56c537bc67e7bfc6c6abc60818b9d120&"; // Reference to the provided image content

export const APP_NAME = "BUNDESPOLIZEI TEAMSTADT";

export const DEFAULT_ADMIN: any = {
  id: 'admin-1',
  firstName: 'Thomas',
  lastName: 'Mueller',
  rank: 'Bundespolizeipräsident',
  badgeNumber: 'Adler 51/01',
  role: 'Leitungsstab',
  isAdmin: true,
  permissions: [
    'view_reports',
    'create_reports',
    'edit_reports',
    'delete_reports',
    'manage_users',
    'view_warrants',
    'manage_warrants',
    'admin_access'
  ]
};
