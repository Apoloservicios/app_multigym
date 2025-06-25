// src/services/firebase/authService.ts
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './config';

export const authService = {
  signIn: async (email: string, password: string) => {
    try {
      console.log('🔐 === INICIO DE LOGIN ===');
      console.log('📧 Email:', email);
      console.log('🔑 Firebase Project ID:', auth.app.options.projectId);
      console.log('🌐 Auth Domain:', auth.app.options.authDomain);
      console.log('🔧 Auth App Name:', auth.app.name);
      
      // Intentar el login
      console.log('⏳ Llamando a signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ LOGIN EXITOSO!');
      console.log('👤 Usuario:', userCredential.user.email);
      console.log('🆔 UID:', userCredential.user.uid);
      
      return userCredential.user;
      
    } catch (error: any) {
      console.log('❌ === ERROR EN LOGIN ===');
      console.log('🔍 Error Code:', error.code);
      console.log('📝 Error Message:', error.message);
      console.log('🔧 Error Stack:', error.stack);
      
      // Errores más específicos
      if (error.code === 'auth/network-request-failed') {
        console.log('🌐 PROBLEMA DE RED DETECTADO');
        console.log('📡 Verificando conectividad...');
        
        // Test de conectividad básico
        try {
          const response = await fetch('https://www.google.com', { 
            method: 'HEAD'
          });
          console.log('🌐 Conectividad a Google:', response.ok ? 'OK' : 'FALLO');
        } catch (netError) {
          console.log('🌐 Sin conectividad a internet');
        }
        
        // Test específico a Firebase
        try {
          const firebaseResponse = await fetch(`https://${auth.app.options.authDomain}`, {
            method: 'HEAD'
          });
          console.log('🔥 Conectividad a Firebase:', firebaseResponse.ok ? 'OK' : 'FALLO');
        } catch (firebaseError: any) {
          console.log('🔥 Sin conectividad a Firebase:', firebaseError.message);
        }
      }
      
      throw new Error(getErrorMessage(error.code));
    }
  },

  signOut: async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await firebaseSignOut(auth);
      console.log('✅ Sesión cerrada');
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error.message);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/network-request-failed':
      return 'Sin conexión a Firebase. Verifica tu internet.';
    case 'auth/user-not-found':
      return 'Usuario no encontrado.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta.';
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos.';
    case 'auth/invalid-credential':
      return 'Credenciales inválidas.';
    default:
      return `Error: ${errorCode}`;
  }
};