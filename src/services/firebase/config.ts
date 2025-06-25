// src/services/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase (usando la configuración web que ya tienes)
const firebaseConfig = {
  apiKey: "AIzaSyD43uNhtAKMTEbjPtQBId67MnrKL81axXg", // ✅ Tu API Key actual
  authDomain: "sisgimnasio.firebaseapp.com",
  projectId: "sisgimnasio",
  storageBucket: "sisgimnasio.firebasestorage.app", 
  messagingSenderId: "434544305726", // ✅ Tu número correcto
  appId: "1:434544305726:web:676b935206eb174ecf136f", // ✅ Tu App ID web
  measurementId: "G-W89SRSVT3D"
};

console.log('🔧 Inicializando Firebase con config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...' // Solo mostrar parte de la key
});

// Inicializar Firebase App
const app = initializeApp(firebaseConfig);

// Configurar Auth (versión simplificada)
export const auth = getAuth(app);

// Configurar Firestore
export const db = getFirestore(app);

// Debug de conexión
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('✅ Firebase Auth: Usuario conectado -', user.email);
  } else {
    console.log('👤 Firebase Auth: Sin usuario');
  }
});

console.log("🔥 Firebase inicializado correctamente para React Native");