
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Deine verifizierten Zugangsdaten für das Projekt "bundespolizei-ts"
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
  laws: collection(db, "laws")
};

export { collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc };
