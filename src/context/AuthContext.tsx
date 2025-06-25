// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/firebase/authService';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 Configurando listener de autenticación...');
    
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('👤 Estado de auth cambió:', user?.email || 'sin usuario');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Intentando login con:', email);
    setLoading(true);
    
    try {
      // Probar conexión primero
      const canConnect = await authService.testFirebaseConnection();
      console.log('🔗 Conexión Firebase:', canConnect ? 'OK' : 'FALLO');
      
      const user = await authService.signIn(email, password);
      console.log('✅ Login exitoso:', user.email);
      // El estado se actualiza automáticamente por onAuthStateChanged
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🚪 Cerrando sesión...');
    setLoading(true);
    
    try {
      await authService.signOut();
      console.log('✅ Sesión cerrada exitosamente');
      // El estado se actualiza automáticamente por onAuthStateChanged
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};