// src/services/firebase/authService.ts
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  connectAuthEmulator
} from 'firebase/auth';
import { auth } from './config';
import NetInfo from '@react-native-community/netinfo';

export const authService = {  
  // Verificar conectividad antes de intentar login
  checkNetworkConnection: async (): Promise<boolean> => {
    try {
      const netInfo = await NetInfo.fetch();
      console.log('🌐 Estado de red:', {
        isConnected: netInfo.isConnected,
        type: netInfo.type,
        isInternetReachable: netInfo.isInternetReachable
      });
      return netInfo.isConnected === true;
    } catch (error) {
      console.log('⚠️ No se pudo verificar la red, continuando...');
      return true; // Asumir que hay conexión si no se puede verificar
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      console.log('🔐 Iniciando proceso de login...');
      
      // Verificar conexión de red
      const isConnected = await authService.checkNetworkConnection();
      if (!isConnected) {
        throw new Error('Sin conexión a internet. Verifica tu conexión de red.');
      }

      console.log('📧 Intentando login con:', email);
      console.log('🔑 Auth domain:', auth.config.authDomain);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Usuario autenticado exitosamente:', userCredential.user.email);
      
      return userCredential.user;
    } catch (error: any) {
      console.error('❌ Error completo:', error);
      console.error('❌ Código de error:', error.code);
      console.error('❌ Mensaje de error:', error.message);
      
      throw new Error(getErrorMessage(error.code));
    }
  },

  signOut: async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await firebaseSignOut(auth);
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error.message);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Función para probar la conectividad con Firebase
  testFirebaseConnection: async () => {
    try {
      console.log('🧪 Probando conexión con Firebase...');
      
      // Intentar una operación simple
      const user = auth.currentUser;
      console.log('👤 Usuario actual:', user?.email || 'ninguno');
      
      return true;
    } catch (error: any) {
      console.error('❌ Error de conexión con Firebase:', error);
      return false;
    }
  }
};

const getErrorMessage = (errorCode: string): string => {
  console.log('🔍 Procesando error code:', errorCode);
  
  switch (errorCode) {
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet y vuelve a intentar.';
    case 'auth/user-not-found':
      return 'Usuario no encontrado. Verifica tu email.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta.';
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada.';
    case 'auth/invalid-credential':
      return 'Credenciales inválidas. Verifica tu email y contraseña.';
    default:
      return `Error de autenticación: ${errorCode}`;
  }
};