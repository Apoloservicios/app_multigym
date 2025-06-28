// src/services/firebase/debugDataService.ts
import { 
  collection, 
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export const debugDataService = {
  // Verificar qué colecciones existen para este miembro
  checkMemberCollections: async (gymId: string, memberId: string) => {
    try {
      console.log('🔍 === DEBUGGING DATOS DEL MIEMBRO ===');
      console.log('🏢 Gym ID:', gymId);
      console.log('👤 Member ID:', memberId);
      
      // 1. Verificar documento del miembro
      console.log('\n📋 1. Verificando documento del miembro...');
      const memberRef = doc(db, 'gyms', gymId, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (memberDoc.exists()) {
        console.log('✅ Documento del miembro existe');
        console.log('📄 Datos del miembro:', memberDoc.data());
      } else {
        console.log('❌ Documento del miembro NO existe');
        return;
      }
      
      // 2. Verificar subcolección de asistencias
      console.log('\n📅 2. Verificando asistencias...');
      try {
        const attendanceRef = collection(db, 'gyms', gymId, 'members', memberId, 'attendance');
        const attendanceSnapshot = await getDocs(attendanceRef);
        console.log(`📊 Asistencias encontradas: ${attendanceSnapshot.size}`);
        
        if (attendanceSnapshot.size > 0) {
          console.log('📋 Primeras asistencias:');
          attendanceSnapshot.docs.slice(0, 3).forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.id}:`, doc.data());
          });
        }
      } catch (error) {
        console.log('❌ Error accediendo a asistencias:', error);
      }
      
      // 3. Verificar colección global de pagos
      console.log('\n💰 3. Verificando pagos en subscriptionPayments...');
      try {
        const paymentsRef = collection(db, 'subscriptionPayments');
        const paymentsSnapshot = await getDocs(paymentsRef);
        console.log(`💳 Total de pagos en sistema: ${paymentsSnapshot.size}`);
        
        // Buscar pagos de este miembro
        const memberPayments = paymentsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.memberId === memberId;
        });
        
        console.log(`💰 Pagos de este miembro: ${memberPayments.length}`);
        if (memberPayments.length > 0) {
          console.log('📋 Primeros pagos:');
          memberPayments.slice(0, 3).forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.id}:`, doc.data());
          });
        }
      } catch (error) {
        console.log('❌ Error accediendo a pagos:', error);
      }
      
      // 4. Verificar suscripciones
      console.log('\n🎫 4. Verificando suscripciones...');
      try {
        const subscriptionsRef = collection(db, 'subscriptions');
        const subscriptionsSnapshot = await getDocs(subscriptionsRef);
        console.log(`🎫 Total de suscripciones: ${subscriptionsSnapshot.size}`);
        
        // Buscar suscripciones de este miembro
        const memberSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.memberId === memberId;
        });
        
        console.log(`🎫 Suscripciones de este miembro: ${memberSubscriptions.length}`);
        if (memberSubscriptions.length > 0) {
          memberSubscriptions.forEach((doc, index) => {
            console.log(`  ${index + 1}. ${doc.id}:`, doc.data());
          });
        }
      } catch (error) {
        console.log('❌ Error accediendo a suscripciones:', error);
      }
      
      // 5. Verificar estructura alternativa de asistencias
      console.log('\n📊 5. Verificando si hay asistencias en otra ubicación...');
      try {
        // Tal vez las asistencias están en el nivel del gimnasio
        const gymAttendanceRef = collection(db, 'gyms', gymId, 'attendances');
        const gymAttendanceSnapshot = await getDocs(gymAttendanceRef);
        console.log(`📊 Asistencias a nivel de gimnasio: ${gymAttendanceSnapshot.size}`);
        
        if (gymAttendanceSnapshot.size > 0) {
          const memberAttendances = gymAttendanceSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.memberId === memberId;
          });
          console.log(`📊 Asistencias de este miembro: ${memberAttendances.length}`);
        }
      } catch (error) {
        console.log('❌ Error buscando asistencias alternativas:', error);
      }
      
      console.log('\n🏁 === FIN DEBUG ===');
      
    } catch (error) {
      console.error('❌ Error general en debug:', error);
    }
  },

  // Verificar todas las colecciones principales
  checkMainCollections: async () => {
    try {
      console.log('\n🗂️ === VERIFICANDO COLECCIONES PRINCIPALES ===');
      
      const collections = [
        'gyms',
        'subscriptions', 
        'subscriptionPayments',
        'subscriptionPlans',
        'globalExercises'
      ];
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          console.log(`📁 ${collectionName}: ${snapshot.size} documentos`);
        } catch (error) {
          console.log(`❌ Error en ${collectionName}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error verificando colecciones:', error);
    }
  }
};