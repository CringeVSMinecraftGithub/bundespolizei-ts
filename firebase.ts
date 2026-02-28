
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, getDoc, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc, limit, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDo3HTvuE3ONkJnowtrJTwjv6Us3CLPVxk",
  authDomain: "bundespolizei-ts.firebaseapp.com",
  projectId: "bundespolizei-ts",
  storageBucket: "bundespolizei-ts.firebasestorage.app",
  messagingSenderId: "830322494565",
  appId: "1:830322494565:web:742bf117074cd5895bca8c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const dbCollections = {
  users: collection(db, "users"),
  applications: collection(db, "applications"),
  submissions: collection(db, "submissions"),
  reports: collection(db, "reports"),
  settings: collection(db, "settings"),
  laws: collection(db, "laws"),
  fleet: collection(db, "fleet"),
  evidence: collection(db, "evidence"),
  warrants: collection(db, "warrants"),
  calendar: collection(db, "calendar"),
  news: collection(db, "news"),
  roles: collection(db, "roles"),
  orgNodes: collection(db, "orgNodes"),
  jobPostings: collection(db, "jobPostings"),
  notifications: collection(db, "notifications"),
  messages: collection(db, "messages"),
  careerProfiles: collection(db, "careerProfiles"),
  careerComponents: collection(db, "careerComponents"),
  fleetLogs: collection(db, "fleetLogs"),
  trainings: collection(db, "trainings"),
  appointments: collection(db, "appointments"),
  notes: collection(db, "notes"),
  inpas_citizens: collection(db, "inpas_citizens"),
  inpas_vehicles: collection(db, "inpas_vehicles"),
  inpas_weapons: collection(db, "inpas_weapons")
};

export { collection, addDoc, getDocs, getDoc, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc, limit, where };
