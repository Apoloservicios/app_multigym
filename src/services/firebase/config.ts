// src/services/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Tu configuración real de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyQ43uNhtAMTEb1PiQ8ld67MnrKL81axXo",
  authDomain: "sisgimnasio.firebaseapp.com",
  projectId: "sisgimnasio",
  storageBucket: "sisgimnasio.firebasestorage.app",
  messagingSenderId: "43544305726",
  appId: "1:43544305726:web:676b93520eeb174ecf136f",
  measurementId: "G-W83SRSYT3D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase inicializado correctamente");