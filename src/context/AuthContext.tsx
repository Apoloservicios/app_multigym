// src/context/AuthContext.tsx - VERSIÓN SEGURA SIN LOOPS
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const [initialLoad, setInitialLoad] = useState(true);

  // Función para cargar datos del miembro con control de errores
  const loadMemberData = useCallback(async (userId: string) => {
    try {
      console.log('🔄 Cargando datos del miembro para userId:', userId);
      
      // Timeout para evitar carga infinita
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading member data')), 15000);
      });

      const memberDataPromise = gymService.getMemberDataByUserId(userId);
      const memberData = await Promise.race([memberDataPromise, timeoutPromise]) as MemberInfo;
      
      if (memberData) {
        setMemberInfo(memberData);
        console.log('✅ Datos del miembro cargados:', memberData.firstName);
        
        // Cargar datos del gimnasio
        const gymDataPromise = gymService.getGymData(memberData.gymId);
        const gymData = await Promise.race([gymDataPromise, timeoutPromise]) as GymInfo;
        
        if (gymData) {
          setGymInfo(gymData);
          console.log('✅ Datos del gimnasio cargados:', gymData.name);
        } else {
          console.log('⚠️ No se encontraron datos del gimnasio');
          setGymInfo(null);
        }
      } else {
        console.log('⚠️ No se encontraron datos del miembro');
        setMemberInfo(null);
        setGymInfo(null);
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del miembro:', error);
      setMemberInfo(null);
      setGymInfo(null);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 Configurando listener de autenticación...');
    
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      try {
        console.log('👤 Estado de auth cambió:', firebaseUser?.email || 'sin usuario');
        setUser(firebaseUser);
        
        if (firebaseUser && initialLoad) {
          setLoading(true);
          await loadMemberData(firebaseUser.uid);
        } else if (!firebaseUser) {
          setMemberInfo(null);
          setGymInfo(null);
        }
        
      } catch (error) {
        console.error('❌ Error en listener de auth:', error);
        setMemberInfo(null);
        setGymInfo(null);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    });

    return unsubscribe;
  }, [loadMemberData, initialLoad]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Intentando login con:', email);
      setLoading(true);
      
      const user = await authService.signIn(email, password);
      console.log('✅ Login exitoso:', user.email);
      
      // Los datos se cargarán automáticamente por onAuthStateChanged
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      setLoading(true);
      
      await authService.signOut();
      console.log('✅ Sesión cerrada exitosamente');
      
      // Limpiar estado local
      setUser(null);
      setMemberInfo(null);
      setGymInfo(null);
      
    } catch (error: any) {
      console.error('❌ Error al cerrar sesión:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshMemberData = async () => {
    if (user) {
      setLoading(true);
      try {
        await loadMemberData(user.uid);
      } finally {
        setLoading(false);
      }
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