// src/services/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANTE: Necesitas completar tu API Key real
// La que tienes está incompleta: "AIzaSyQ43uNhtAMTEb1PiQ8ld67MnrKL81axXo"
// Debes obtener la API Key completa desde tu consola de Firebase

const firebaseConfig = {
  apiKey: "AIzaSyD43uNhtAKMTEbjPtQBId67MnrKL81axXg",
  authDomain: "sisgimnasio.firebaseapp.com",
  projectId: "sisgimnasio",
  storageBucket: "sisgimnasio.firebasestorage.app",
  messagingSenderId: "434544305726",
  appId: "1:434544305726:web:676b935206eb174ecf136f",
  measurementId: "G-W89SRSVT3D"
};

// Verificar que la configuración está completa
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "AIzaSyD43uNhtAKMTEbjPtQBId67MnrKL81axXg") {
  console.error('❌ FIREBASE CONFIG ERROR: API Key no configurada correctamente');
  console.error('📋 Ve a tu consola de Firebase y obtén la API Key completa');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Firebase inicializado correctamente");