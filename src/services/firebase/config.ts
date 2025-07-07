// src/services/firebase/config.ts - VERSIÓN CORREGIDA SIN ERRORES
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase 
const firebaseConfig = {
  apiKey: "AIzaSyD43uNhtAKMTEbjPtQBId67MnrKL81axXg",
  authDomain: "sisgimnasio.firebaseapp.com",
  projectId: "sisgimnasio",
  storageBucket: "sisgimnasio.firebasestorage.app", 
  messagingSenderId: "434544305726",
  appId: "1:434544305726:web:676b935206eb174ecf136f",
  measurementId: "G-W89SRSVT3D"
};

// Validar configuración básica
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing required fields');
}

console.log('🔧 Inicializando Firebase para React Native...');

// Inicializar Firebase App
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App inicializada');
} catch (error) {
  console.error('❌ Error inicializando Firebase App:', error);
  // No hacer throw para evitar crash de la app
  app = null;
}

// Configurar Auth
let auth;
try {
  if (app) {
    auth = getAuth(app);
    console.log('✅ Firebase Auth configurada');
  }
} catch (error) {
  console.error('❌ Error configurando Auth:', error);
  auth = null;
}

// Configurar Firestore
let db;
try {
  if (app) {
    db = getFirestore(app);
    console.log('✅ Firestore configurada');
  }
} catch (error) {
  console.error('❌ Error configurando Firestore:', error);
  db = null;
}

// Listener de estado de autenticación (solo si auth está disponible)
if (auth) {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
    } else {
      console.log('👤 Sin usuario autenticado');
    }
  });
}

// Exportar con validación
export { auth, db };
export default app;

console.log("🔥 Firebase inicializado para React Native");