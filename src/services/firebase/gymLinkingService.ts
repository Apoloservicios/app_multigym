// src/services/firebase/gymLinkingService.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  getDoc 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './config';

export interface GymInfo {
  id: string;
  name: string;
  owner: string;
  address: string;
  code: string;
}

export interface MemberInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  gymId: string;
}

export const gymLinkingService = {
  // Buscar gimnasios por nombre
  searchGymsByName: async (searchQuery: string): Promise<GymInfo[]> => {
    try {
      const gymsRef = collection(db, 'gyms');
      const querySnapshot = await getDocs(gymsRef);
      
      const gyms: GymInfo[] = [];
      querySnapshot.forEach((doc) => {
        const gymData = doc.data();
        const gymName = gymData.name?.toLowerCase() || '';
        
        // Buscar coincidencias parciales en el nombre
        if (gymName.includes(searchQuery.toLowerCase())) {
          gyms.push({
            id: doc.id,
            ...gymData
          } as GymInfo);
        }
      });
      
      return gyms;
      
    } catch (error) {
      console.error('Error buscando gimnasios:', error);
      throw error;
    }
  },

  // Buscar miembro por teléfono principalmente
  findMemberInGym: async (
    gymId: string, 
    phone: string, 
    firstName: string,
    lastName: string,
    email?: string
  ): Promise<MemberInfo | null> => {
    try {
      const membersRef = collection(db, 'gyms', gymId, 'members');
      
      // Buscar primero por teléfono
      let q = query(membersRef, where('phone', '==', phone));
      let querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty && email) {
        // Si no encuentra por teléfono, buscar por email
        q = query(membersRef, where('email', '==', email.toLowerCase()));
        querySnapshot = await getDocs(q);
      }
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Verificar que el nombre coincida
      for (const doc of querySnapshot.docs) {
        const memberData = doc.data();
        const memberFirstName = memberData.firstName?.toLowerCase() || '';
        const memberLastName = memberData.lastName?.toLowerCase() || '';
        
        if (memberFirstName.includes(firstName.toLowerCase()) && 
            memberLastName.includes(lastName.toLowerCase())) {
          return {
            id: doc.id,
            gymId,
            ...memberData
          } as MemberInfo;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error buscando miembro:', error);
      throw error;
    }
  },

  // Crear cuenta de usuario y vincular con miembro
  linkMemberAccount: async (
    memberInfo: MemberInfo,
    password: string
  ): Promise<void> => {
    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        memberInfo.email, 
        password
      );
      
      const userId = userCredential.user.uid;
      
      // 2. Actualizar documento del miembro con el userId
      const memberRef = doc(db, 'gyms', memberInfo.gymId, 'members', memberInfo.id);
      await updateDoc(memberRef, {
        userId: userId,
        linkedAt: new Date(),
        accountStatus: 'linked'
      });
      
      console.log('✅ Cuenta vinculada exitosamente');
      
    } catch (error: any) {
      console.error('Error vinculando cuenta:', error);
      
      // Manejar errores específicos
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Ya existe una cuenta con este email');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil');
      } else {
        throw new Error('Error al crear la cuenta');
      }
    }
  },

  // Obtener datos completos del miembro por userId
  getMemberDataByUserId: async (userId: string): Promise<MemberInfo | null> => {
    try {
      // Buscar en todas las colecciones de miembros
      const gymsRef = collection(db, 'gyms');
      const gymsSnapshot = await getDocs(gymsRef);
      
      for (const gymDoc of gymsSnapshot.docs) {
        const membersRef = collection(db, 'gyms', gymDoc.id, 'members');
        const q = query(membersRef, where('userId', '==', userId));
        const membersSnapshot = await getDocs(q);
        
        if (!membersSnapshot.empty) {
          const memberDoc = membersSnapshot.docs[0];
          return {
            id: memberDoc.id,
            gymId: gymDoc.id,
            ...memberDoc.data()
          } as MemberInfo;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error obteniendo datos del miembro:', error);
      throw error;
    }
  },

  // Obtener datos del gimnasio
  getGymData: async (gymId: string): Promise<GymInfo | null> => {
    try {
      const gymRef = doc(db, 'gyms', gymId);
      const gymSnapshot = await getDoc(gymRef);
      
      if (!gymSnapshot.exists()) {
        return null;
      }
      
      return {
        id: gymSnapshot.id,
        ...gymSnapshot.data()
      } as GymInfo;
      
    } catch (error) {
      console.error('Error obteniendo datos del gimnasio:', error);
      throw error;
    }
  }
};