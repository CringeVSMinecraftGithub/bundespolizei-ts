
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// Add limit to the imports from firebase-firestore
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
  warrants: collection(db, "warrants")
};

// Export limit so it can be used in other files
export { collection, addDoc, getDocs, updateDoc, doc, onSnapshot, query, orderBy, setDoc, deleteDoc, limit };
