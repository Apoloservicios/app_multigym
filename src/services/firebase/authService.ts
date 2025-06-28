// src/services/firebase/authService.ts
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './config';

export const authService = {
  signIn: async (emailOrPhone: string, password: string) => {
    try {
      console.log('🔐 === INICIO DE LOGIN ===');
      console.log('📧 Identifier recibido:', emailOrPhone);
      
      // Detectar si es email o teléfono y formatear
      let emailForAuth = emailOrPhone.trim().toLowerCase();
      
      // Si es solo números, convertir a formato email
      if (/^\d+$/.test(emailForAuth)) {
        emailForAuth = `${emailForAuth}@gymapp.local`;
        console.log('📱 Teléfono detectado, convertido a:', emailForAuth);
      } else if (!emailForAuth.includes('@')) {
        // Si no tiene @ y no es solo números, agregar dominio por defecto
        emailForAuth = `${emailForAuth}@gymapp.local`;
        console.log('🔄 Formato convertido a:', emailForAuth);
      }
      
      console.log('🔑 Firebase Project ID:', auth.app.options.projectId);
      console.log('🌐 Auth Domain:', auth.app.options.authDomain);
      console.log('🔧 Email final para auth:', emailForAuth);
      
      // Intentar el login
      console.log('⏳ Llamando a signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, emailForAuth, password);
      
      console.log('✅ LOGIN EXITOSO!');
      console.log('👤 Usuario:', userCredential.user.email);
      console.log('🆔 UID:', userCredential.user.uid);
      
      return userCredential.user;
      
    } catch (error: any) {
      console.log('❌ === ERROR EN LOGIN ===');
      console.log('🔍 Error Code:', error.code);
      console.log('📝 Error Message:', error.message);
      
      // Errores específicos con mensajes más amigables
      if (error.code === 'auth/network-request-failed') {
        console.log('🌐 PROBLEMA DE RED DETECTADO');
        throw new Error('Sin conexión a Firebase. Verifica tu internet.');
      } else if (error.code === 'auth/user-not-found') {
        console.log('👤 Usuario no encontrado');
        throw new Error('No se encontró una cuenta con estos datos. ¿Ya te registraste?');
      } else if (error.code === 'auth/wrong-password') {
        console.log('🔑 Contraseña incorrecta');
        throw new Error('Contraseña incorrecta. Inténtalo de nuevo.');
      } else if (error.code === 'auth/invalid-credential') {
        console.log('🚫 Credenciales inválidas');
        throw new Error('Email/teléfono o contraseña incorrectos.');
      } else if (error.code === 'auth/invalid-email') {
        console.log('📧 Email inválido');
        throw new Error('Formato de email inválido.');
      } else if (error.code === 'auth/too-many-requests') {
        console.log('⏰ Demasiados intentos');
        throw new Error('Demasiados intentos fallidos. Espera unos minutos.');
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