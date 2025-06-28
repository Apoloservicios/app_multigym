// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/firebase/authService';
import { gymService, MemberInfo, GymInfo } from '../services/firebase/gymService';

interface AuthContextData {
  user: User | null;
  memberInfo: MemberInfo | null;
  gymInfo: GymInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMemberData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos reales del miembro
  const loadMemberData = async (userId: string) => {
    try {
      console.log('🔄 Cargando datos reales del miembro...');
      
      // Buscar miembro real en Firebase
      const memberData = await gymService.getMemberDataByUserId(userId);
      if (memberData) {
        setMemberInfo(memberData);
        console.log('✅ Datos del miembro cargados:', memberData.firstName, memberData.lastName);
        
        // Cargar datos del gimnasio
        const gymData = await gymService.getGymData(memberData.gymId);
        if (gymData) {
          setGymInfo(gymData);
          console.log('✅ Datos del gimnasio cargados:', gymData.name);
        }
      } else {
        console.log('⚠️ No se encontraron datos del miembro - cuenta no vinculada');
        setMemberInfo(null);
        setGymInfo(null);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del miembro:', error);
      setMemberInfo(null);
      setGymInfo(null);
    }
  };

  useEffect(() => {
    console.log('🔄 Configurando listener de autenticación...');
    
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      console.log('👤 Estado de auth cambió:', user?.email || 'sin usuario');
      setUser(user);
      
      if (user) {
        await loadMemberData(user.uid);
      } else {
        setMemberInfo(null);
        setGymInfo(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Intentando login con:', email);
    setLoading(true);
    
    try {
      const user = await authService.signIn(email, password);
      console.log('✅ Login exitoso:', user.email);
      // Los datos se cargan automáticamente por onAuthStateChanged
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
      // El estado se limpia automáticamente por onAuthStateChanged
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshMemberData = async () => {
    if (user) {
      await loadMemberData(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      memberInfo,
      gymInfo,
      loading,
      signIn,
      signOut,
      refreshMemberData,
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