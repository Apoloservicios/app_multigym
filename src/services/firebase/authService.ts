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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario autenticado:', userCredential.user.email);
      return userCredential.user;
    } catch (error: any) {
      console.error('Error en login:', error.message);
      throw new Error(getErrorMessage(error.code));
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      console.log('Sesión cerrada');
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error.message);
      throw error;
    }
  },

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};

const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuario no encontrado';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde';
    case 'auth/network-request-failed':
      return 'Error de conexión';
    default:
      return 'Error al iniciar sesión';
  }
};