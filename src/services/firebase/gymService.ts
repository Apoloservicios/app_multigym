// src/services/firebase/gymService.ts
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
  phone: string;
  email: string;
  status: string;
  registrationDate: any;
}

export interface MemberInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  birthDate: string;
  status: string;
  gymId: string;
  createdAt: any;
  updatedAt: any;
  totalDebt?: number;
  userId?: string; // 👈 Agregamos esta propiedad
  linkedAt?: any;
  accountStatus?: string;
  authEmail?: string;
}

export const gymService = {
  // Buscar todos los gimnasios activos
  getAllActiveGyms: async (): Promise<GymInfo[]> => {
    try {
      console.log('🔍 Buscando gimnasios activos...');
      
      const gymsRef = collection(db, 'gyms');
      const q = query(gymsRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      const gyms: GymInfo[] = [];
      querySnapshot.forEach((doc) => {
        const gymData = doc.data();
        gyms.push({
          id: doc.id,
          name: gymData.name || 'Sin nombre',
          owner: gymData.owner || 'Sin propietario',
          address: gymData.address || 'Sin dirección',
          phone: gymData.phone || 'Sin teléfono',
          email: gymData.email || 'Sin email',
          status: gymData.status || 'unknown',
          registrationDate: gymData.registrationDate
        });
      });
      
      console.log(`✅ Encontrados ${gyms.length} gimnasios activos`);
      return gyms;
      
    } catch (error) {
      console.error('❌ Error obteniendo gimnasios:', error);
      throw error;
    }
  },

  // Buscar gimnasios por nombre
  searchGymsByName: async (searchQuery: string): Promise<GymInfo[]> => {
    try {
      console.log('🔍 Buscando gimnasios con:', searchQuery);
      
      // Obtener todos los gimnasios activos
      const allGyms = await gymService.getAllActiveGyms();
      
      // Filtrar por nombre (búsqueda local para mejor rendimiento)
      const filteredGyms = allGyms.filter(gym => 
        gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gym.owner.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      console.log(`✅ Encontrados ${filteredGyms.length} gimnasios que coinciden`);
      return filteredGyms;
      
    } catch (error) {
      console.error('❌ Error buscando gimnasios:', error);
      throw error;
    }
  },

  // Buscar miembro en un gimnasio específico por teléfono
  findMemberInGym: async (
    gymId: string, 
    phone: string, 
    firstName: string,
    lastName: string,
    email?: string
  ): Promise<MemberInfo | null> => {
    try {
      console.log('🔍 Buscando miembro en gimnasio:', gymId);
      console.log('📱 Teléfono:', phone);
      console.log('👤 Nombre:', firstName, lastName);
      
      const membersRef = collection(db, 'gyms', gymId, 'members');
      
      // Buscar por teléfono primero
      const phoneQuery = query(membersRef, where('phone', '==', phone));
      let querySnapshot = await getDocs(phoneQuery);
      
      if (querySnapshot.empty && email) {
        // Si no encuentra por teléfono, buscar por email
        console.log('📧 Buscando por email:', email);
        const emailQuery = query(membersRef, where('email', '==', email.toLowerCase()));
        querySnapshot = await getDocs(emailQuery);
      }
      
      if (querySnapshot.empty) {
        console.log('❌ No se encontró miembro con esos datos');
        return null;
      }
      
      // Verificar que el nombre coincida (búsqueda flexible)
      for (const doc of querySnapshot.docs) {
        const memberData = doc.data();
        const memberFirstName = (memberData.firstName || '').toLowerCase();
        const memberLastName = (memberData.lastName || '').toLowerCase();
        const searchFirstName = firstName.toLowerCase();
        const searchLastName = lastName.toLowerCase();
        
        // Verificación flexible del nombre
        const firstNameMatch = memberFirstName.includes(searchFirstName) || 
                              searchFirstName.includes(memberFirstName);
        const lastNameMatch = memberLastName.includes(searchLastName) || 
                             searchLastName.includes(memberLastName);
        
        if (firstNameMatch && lastNameMatch) {
          console.log('✅ Miembro encontrado:', memberData.firstName, memberData.lastName);
          
          return {
            id: doc.id,
            gymId,
            email: memberData.email || '',
            firstName: memberData.firstName || '',
            lastName: memberData.lastName || '',
            phone: memberData.phone || '',
            address: memberData.address || '',
            birthDate: memberData.birthDate || '',
            status: memberData.status || 'unknown',
            createdAt: memberData.createdAt,
            updatedAt: memberData.updatedAt,
            totalDebt: memberData.totalDebt || 0,
            userId: memberData.userId, // 👈 Incluir userId si existe
            linkedAt: memberData.linkedAt,
            accountStatus: memberData.accountStatus,
            authEmail: memberData.authEmail
          };
        }
      }
      
      console.log('❌ Teléfono/email encontrado pero nombre no coincide');
      return null;
      
    } catch (error) {
      console.error('❌ Error buscando miembro:', error);
      throw error;
    }
  },

  // Crear cuenta de usuario y vincular con miembro
  linkMemberAccount: async (
    memberInfo: MemberInfo,
    password: string,
    usePhoneAsEmail: boolean = false
  ): Promise<void> => {
    try {
      console.log('🔗 Vinculando cuenta del miembro...');
      
      let emailForAuth = memberInfo.email;
      
      // Si no tiene email, usar teléfono + @gymapp.com
      if (!emailForAuth || emailForAuth.trim() === '' || usePhoneAsEmail) {
        emailForAuth = `${memberInfo.phone}@gymapp.local`;
        console.log('📧 Usando email generado:', emailForAuth);
      }
      
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        emailForAuth, 
        password
      );
      
      const userId = userCredential.user.uid;
      console.log('✅ Usuario Firebase creado:', userId);
      
      // 2. Actualizar documento del miembro con el userId
      const memberRef = doc(db, 'gyms', memberInfo.gymId, 'members', memberInfo.id);
      await updateDoc(memberRef, {
        userId: userId,
        linkedAt: new Date(),
        accountStatus: 'linked',
        authEmail: emailForAuth // Guardar el email usado para auth
      });
      
      console.log('✅ Cuenta vinculada exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error vinculando cuenta:', error);
      
      // Manejar errores específicos
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Ya existe una cuenta con este email/teléfono');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La contraseña es muy débil');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      } else {
        throw new Error('Error al crear la cuenta: ' + error.message);
      }
    }
  },

  // Obtener datos completos del miembro por userId
  getMemberDataByUserId: async (userId: string): Promise<MemberInfo | null> => {
    try {
      console.log('🔍 Buscando miembro por userId:', userId);
      
      // Buscar en todas las colecciones de miembros
      const gymsRef = collection(db, 'gyms');
      const gymsSnapshot = await getDocs(gymsRef);
      
      for (const gymDoc of gymsSnapshot.docs) {
        const membersRef = collection(db, 'gyms', gymDoc.id, 'members');
        const q = query(membersRef, where('userId', '==', userId));
        const membersSnapshot = await getDocs(q);
        
        if (!membersSnapshot.empty) {
          const memberDoc = membersSnapshot.docs[0];
          const memberData = memberDoc.data();
          
          console.log('✅ Miembro encontrado:', memberData.firstName);
          
          return {
            id: memberDoc.id,
            gymId: gymDoc.id,
            email: memberData.email || '',
            firstName: memberData.firstName || '',
            lastName: memberData.lastName || '',
            phone: memberData.phone || '',
            address: memberData.address || '',
            birthDate: memberData.birthDate || '',
            status: memberData.status || 'unknown',
            createdAt: memberData.createdAt,
            updatedAt: memberData.updatedAt,
            totalDebt: memberData.totalDebt || 0,
            userId: memberData.userId, // 👈 Incluir userId
            linkedAt: memberData.linkedAt,
            accountStatus: memberData.accountStatus,
            authEmail: memberData.authEmail
          };
        }
      }
      
      console.log('❌ No se encontró miembro con ese userId');
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo datos del miembro:', error);
      throw error;
    }
  },

  // Obtener datos del gimnasio
  getGymData: async (gymId: string): Promise<GymInfo | null> => {
    try {
      console.log('🔍 Obteniendo datos del gimnasio:', gymId);
      
      const gymRef = doc(db, 'gyms', gymId);
      const gymSnapshot = await getDoc(gymRef);
      
      if (!gymSnapshot.exists()) {
        console.log('❌ Gimnasio no encontrado');
        return null;
      }
      
      const gymData = gymSnapshot.data();
      console.log('✅ Datos del gimnasio obtenidos:', gymData.name);
      
      return {
        id: gymSnapshot.id,
        name: gymData.name || 'Sin nombre',
        owner: gymData.owner || 'Sin propietario',
        address: gymData.address || 'Sin dirección',
        phone: gymData.phone || 'Sin teléfono',
        email: gymData.email || 'Sin email',
        status: gymData.status || 'unknown',
        registrationDate: gymData.registrationDate
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo datos del gimnasio:', error);
      throw error;
    }
  }
};