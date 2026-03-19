// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } 
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mt2classicworldbosstimer.firebaseapp.com",
  projectId: "mt2classicworldbosstimer",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// expose globally AFTER init
window.db = db;
window.fb = { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc };

// 🔥 notify main.js it's ready
window.dispatchEvent(new Event("firebase-ready"));
