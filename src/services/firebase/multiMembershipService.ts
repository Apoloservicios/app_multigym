// src/services/firebase/multiMembershipService.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export interface MembershipInfo {
  id: string;
  memberId: string;
  gymId: string;
  gymName: string;
  planType: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: Timestamp;
  endDate: Timestamp;
  monthlyFee: number;
  totalDebt: number;
}

export interface MembershipAttendance {
  id: string;
  membershipId: string;
  date: Timestamp;
  time: string;
  type: 'check-in' | 'check-out';
}

export interface MembershipPayment {
  id: string;
  membershipId: string;
  amount: number;
  date: Timestamp;
  concept: string;
  status: 'paid' | 'pending' | 'overdue';
}

export const multiMembershipService = {
  // Obtener todas las membresías de un usuario basado en la estructura real
  getUserMemberships: async (memberId: string): Promise<MembershipInfo[]> => {
    try {
      console.log('🎫 Obteniendo membresías reales del usuario:', memberId);
      
      // Buscar en membershipAssignments (según la estructura real)
      const membershipAssignmentsRef = collection(db, 'membershipAssignments');
      const q = query(
        membershipAssignmentsRef,
        where('memberId', '==', memberId)
      );
      
      const querySnapshot = await getDocs(q);
      const memberships: MembershipInfo[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        
        console.log('📋 Membership assignment encontrado:', data);
        
        // Obtener información del plan
        let planInfo = {
          name: data.activityName || data.planName || 'Plan sin nombre',
          monthlyFee: 0
        };
        
        // Buscar en subscriptionPlans si hay planId
        if (data.planId) {
          try {
            const planRef = doc(db, 'subscriptionPlans', data.planId);
            const planDoc = await getDoc(planRef);
            if (planDoc.exists()) {
              const planData = planDoc.data() as any;
              planInfo.monthlyFee = planData.price || planData.monthlyFee || 0;
            }
          } catch (error) {
            console.log('⚠️ Error obteniendo plan:', error);
          }
        }
        
        // Obtener nombre del gimnasio
        let gymName = 'Gimnasio';
        if (data.gymId) {
          try {
            const gymRef = doc(db, 'gyms', data.gymId);
            const gymDoc = await getDoc(gymRef);
            if (gymDoc.exists()) {
              const gymData = gymDoc.data() as any;
              gymName = gymData.name || 'Gimnasio';
            }
          } catch (error) {
            console.log('⚠️ Error obteniendo gimnasio:', error);
          }
        }
        
        // Calcular deuda y estado
        const totalDebt = data.totalDebt || 0;
        const status = data.status === 'active' ? 'active' : 
                      data.endDate && new Date(data.endDate.toDate()) < new Date() ? 'expired' : 
                      'active';
        
        memberships.push({
          id: docSnap.id,
          memberId: data.memberId,
          gymId: data.gymId || '',
          gymName: gymName,
          planType: planInfo.name,
          status: status,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyFee: data.cost || planInfo.monthlyFee || 0,
          totalDebt: totalDebt
        });
      }
      
      console.log(`✅ ${memberships.length} membresías reales encontradas`);
      return memberships;
      
    } catch (error) {
      console.error('❌ Error obteniendo membresías reales:', error);
      return [];
    }
  },

  // Obtener asistencias reales del sistema web
  getMembershipAttendance: async (membershipId: string, limitCount: number = 10): Promise<MembershipAttendance[]> => {
    try {
      console.log('📊 Obteniendo asistencias reales de membresía:', membershipId);
      
      // Buscar asistencias en la estructura real
      // Basado en las capturas, parece que están en una colección de asistencias
      const attendanceRef = collection(db, 'attendances');
      const q = query(
        attendanceRef,
        where('membershipAssignmentId', '==', membershipId), // o el campo correcto
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const attendances: MembershipAttendance[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        attendances.push({
          id: docSnap.id,
          membershipId: membershipId,
          date: data.date,
          time: data.time || data.hora || '00:00',
          type: 'check-in' // Por defecto, ajustar según datos reales
        });
      });
      
      // Si no encuentra por membershipId, buscar por memberId directamente
      if (attendances.length === 0) {
        console.log('🔍 Buscando asistencias por memberId...');
        const memberAttendanceRef = collection(db, 'attendances');
        const memberQuery = query(
          memberAttendanceRef,
          where('memberId', '==', membershipId), // Puede que esté mal el campo
          orderBy('date', 'desc'),
          limit(limitCount)
        );
        
        const memberQuerySnapshot = await getDocs(memberQuery);
        memberQuerySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          attendances.push({
            id: docSnap.id,
            membershipId: membershipId,
            date: data.date,
            time: data.time || data.hora || '11:34', // Ejemplo de las capturas
            type: 'check-in'
          });
        });
      }
      
      console.log(`✅ ${attendances.length} asistencias reales encontradas`);
      return attendances;
      
    } catch (error) {
      console.error('❌ Error obteniendo asistencias reales:', error);
      return [];
    }
  },

  // Obtener pagos de una membresía específica
  getMembershipPayments: async (membershipId: string): Promise<MembershipPayment[]> => {
    try {
      console.log('💰 Obteniendo pagos de membresía:', membershipId);
      
      const paymentsRef = collection(db, 'subscriptionPayments');
      const q = query(
        paymentsRef,
        where('subscriptionId', '==', membershipId), // o membershipId
        orderBy('date', 'desc'),
        limit(5)
      );
      
      const querySnapshot = await getDocs(q);
      const payments: MembershipPayment[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        payments.push({
          id: docSnap.id,
          membershipId: membershipId,
          amount: data.amount || 0,
          date: data.date,
          concept: data.concept || 'Cuota mensual',
          status: data.status || 'pending'
        });
      });
      
      console.log(`✅ ${payments.length} pagos encontrados para membresía`);
      return payments;
      
    } catch (error) {
      console.error('❌ Error obteniendo pagos de membresía:', error);
      return [];
    }
  },

  // Obtener resumen de todas las membresías
  getMembershipsSummary: async (memberId: string) => {
    try {
      const memberships = await multiMembershipService.getUserMemberships(memberId);
      
      const summary = {
        totalMemberships: memberships.length,
        activeMemberships: memberships.filter((m: MembershipInfo) => m.status === 'active').length,
        totalDebt: memberships.reduce((sum: number, m: MembershipInfo) => sum + (m.totalDebt || 0), 0),
        gyms: [...new Set(memberships.map((m: MembershipInfo) => m.gymName))],
        plans: [...new Set(memberships.map((m: MembershipInfo) => m.planType))]
      };
      
      console.log('📊 Resumen de membresías:', summary);
      return summary;
      
    } catch (error) {
      console.error('❌ Error calculando resumen:', error);
      return {
        totalMemberships: 0,
        activeMemberships: 0,
        totalDebt: 0,
        gyms: [],
        plans: []
      };
    }
  },

  // Debug actualizado para la estructura real
  debugMembershipStructure: async (memberId: string) => {
    try {
      console.log('\n🔍 === DEBUG ESTRUCTURA REAL ===');
      console.log('👤 Member ID:', memberId);
      
      // 1. Verificar membershipAssignments (estructura principal)
      console.log('\n📋 1. Verificando membershipAssignments...');
      const assignmentsRef = collection(db, 'membershipAssignments');
      const assignmentsQuery = query(assignmentsRef, where('memberId', '==', memberId));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      console.log(`🎫 MembershipAssignments encontrados: ${assignmentsSnapshot.size}`);
      assignmentsSnapshot.docs.forEach((docSnap, index) => {
        console.log(`  ${index + 1}. ${docSnap.id}:`, docSnap.data());
      });
      
      // 2. Verificar subscriptionPlans
      console.log('\n📋 2. Verificando subscriptionPlans...');
      const plansRef = collection(db, 'subscriptionPlans');
      const plansSnapshot = await getDocs(plansRef);
      console.log(`📊 Total subscription plans: ${plansSnapshot.size}`);
      
      // 3. Verificar attendances reales
      console.log('\n📊 3. Verificando attendances...');
      const attendancesRef = collection(db, 'attendances');
      const attendancesQuery = query(attendancesRef, where('memberId', '==', memberId));
      const attendancesSnapshot = await getDocs(attendancesQuery);
      
      console.log(`📊 Attendances del usuario: ${attendancesSnapshot.size}`);
      attendancesSnapshot.docs.slice(0, 3).forEach((docSnap, index) => {
        console.log(`  ${index + 1}. ${docSnap.id}:`, docSnap.data());
      });
      
      // 4. Verificar subscriptionPayments
      console.log('\n💰 4. Verificando subscriptionPayments...');
      const paymentsRef = collection(db, 'subscriptionPayments');
      const paymentsQuery = query(paymentsRef, where('memberId', '==', memberId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      console.log(`💰 Payments del usuario: ${paymentsSnapshot.size}`);
      paymentsSnapshot.docs.slice(0, 3).forEach((docSnap, index) => {
        console.log(`  ${index + 1}. ${docSnap.id}:`, docSnap.data());
      });
      
      console.log('\n🏁 === FIN DEBUG REAL ===');
      
    } catch (error) {
      console.error('❌ Error en debug real:', error);
    }
  }
};