// src/services/firebase/memberDataService.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

export interface AttendanceRecord {
  id: string;
  date: Timestamp;
  time: string;
  type: 'check-in' | 'check-out';
  memberId: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: Timestamp;
  concept: string;
  status: 'paid' | 'pending' | 'overdue';
  memberId: string;
}

export interface MembershipDetails {
  type: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: Timestamp;
  endDate: Timestamp;
  plan: string;
}

export const memberDataService = {
  // Obtener asistencias recientes del miembro
  getRecentAttendance: async (gymId: string, memberId: string, limit_count: number = 10): Promise<AttendanceRecord[]> => {
    try {
      console.log('📊 Obteniendo asistencias recientes...');
      
      const attendanceRef = collection(db, 'gyms', gymId, 'members', memberId, 'attendance');
      const q = query(
        attendanceRef,
        orderBy('date', 'desc'),
        limit(limit_count)
      );
      
      const querySnapshot = await getDocs(q);
      const attendances: AttendanceRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendances.push({
          id: doc.id,
          date: data.date,
          time: data.time || '00:00',
          type: data.type || 'check-in',
          memberId: memberId
        });
      });
      
      console.log(`✅ ${attendances.length} asistencias obtenidas`);
      return attendances;
      
    } catch (error) {
      console.error('❌ Error obteniendo asistencias:', error);
      return [];
    }
  },

  // Obtener pagos del miembro
  getMemberPayments: async (gymId: string, memberId: string): Promise<PaymentRecord[]> => {
    try {
      console.log('💰 Obteniendo pagos del miembro...');
      
      // Buscar en la colección de pagos de suscripciones
      const paymentsRef = collection(db, 'subscriptionPayments');
      const q = query(
        paymentsRef,
        where('memberId', '==', memberId),
        orderBy('date', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const payments: PaymentRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          amount: data.amount || 0,
          date: data.date,
          concept: data.concept || 'Pago de membresía',
          status: data.status || 'pending',
          memberId: memberId
        });
      });
      
      console.log(`✅ ${payments.length} pagos obtenidos`);
      return payments;
      
    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      return [];
    }
  },

  // Obtener detalles de la membresía
  getMembershipDetails: async (gymId: string, memberId: string): Promise<MembershipDetails | null> => {
    try {
      console.log('🎫 Obteniendo detalles de membresía...');
      
      // Buscar en subscriptions
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(
        subscriptionsRef,
        where('memberId', '==', memberId),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return {
          type: data.planType || 'Membresía',
          status: data.status || 'active',
          startDate: data.startDate,
          endDate: data.endDate,
          plan: data.planName || 'Plan Básico'
        };
      }
      
      console.log('⚠️ No se encontró membresía activa');
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo membresía:', error);
      return null;
    }
  },

  // Contar visitas del mes actual
  getMonthlyVisitCount: async (gymId: string, memberId: string): Promise<number> => {
    try {
      console.log('📈 Contando visitas del mes...');
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const attendanceRef = collection(db, 'gyms', gymId, 'members', memberId, 'attendance');
      const q = query(
        attendanceRef,
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        where('type', '==', 'check-in')
      );
      
      const querySnapshot = await getDocs(q);
      const count = querySnapshot.size;
      
      console.log(`✅ ${count} visitas este mes`);
      return count;
      
    } catch (error) {
      console.error('❌ Error contando visitas:', error);
      return 0;
    }
  },

  // Obtener próximo pago pendiente
  getNextPendingPayment: async (memberId: string): Promise<PaymentRecord | null> => {
    try {
      console.log('💳 Buscando próximo pago pendiente...');
      
      const paymentsRef = collection(db, 'subscriptionPayments');
      const q = query(
        paymentsRef,
        where('memberId', '==', memberId),
        where('status', '==', 'pending'),
        orderBy('date', 'asc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return {
          id: doc.id,
          amount: data.amount || 0,
          date: data.date,
          concept: data.concept || 'Cuota mensual',
          status: data.status || 'pending',
          memberId: memberId
        };
      }
      
      console.log('✅ No hay pagos pendientes');
      return null;
      
    } catch (error) {
      console.error('❌ Error buscando próximo pago:', error);
      return null;
    }
  }
};