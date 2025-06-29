// src/services/firebase/memberDataService.ts (CORREGIDO V2)
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

export interface AttendanceRecord {
  id: string;
  date: Timestamp;
  time: string;
  type: 'check-in' | 'check-out';
  memberId: string;
  duration?: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: Timestamp;
  concept: string;
  status: 'paid' | 'pending' | 'overdue';
  memberId: string;
  paymentMethod?: string;
}

export interface MembershipDetails {
  type: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: Timestamp;
  endDate: Timestamp;
  plan: string;
  monthlyFee?: number;
}

export interface MemberDashboardData {
  totalVisitsThisMonth: number;
  totalVisitsThisWeek: number;
  lastVisitDate: Date | null;
  nextPaymentDue: PaymentRecord | null;
  totalDebt: number;
  membershipStatus: 'active' | 'expired' | 'suspended';
  memberSince: Date | null;
}

export const memberDataService = {
  // Obtener asistencias recientes del miembro (SIMPLIFICADO)
  getRecentAttendance: async (gymId: string, memberId: string, limitCount: number = 10): Promise<AttendanceRecord[]> => {
    try {
      console.log('📊 Obteniendo asistencias recientes (modo simplificado)...');
      
      // Solo intentar ubicaciones que sabemos que existen y tienen permisos
      const attendanceLocations = [
        // Ubicación 1: En subcollection del miembro (más probable que funcione)
        { ref: collection(db, 'gyms', gymId, 'members', memberId, 'attendance'), needsFilter: false },
        // Ubicación 2: Global sin índices complejos
        { ref: collection(db, 'attendances'), needsFilter: true }
      ];

      for (const location of attendanceLocations) {
        try {
          let q;
          
          if (location.needsFilter) {
            // Para la colección global, usar query simple sin orderBy para evitar índices
            q = query(
              location.ref,
              where('memberId', '==', memberId),
              limit(limitCount)
            );
          } else {
            // Para la subcollección, también simplificar
            q = query(
              location.ref,
              limit(limitCount)
            );
          }

          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const attendances: AttendanceRecord[] = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              attendances.push({
                id: doc.id,
                date: data.date || Timestamp.now(),
                time: data.time || data.checkInTime || '00:00',
                type: data.type || 'check-in',
                memberId: data.memberId || memberId,
                duration: data.duration
              });
            });
            
            // Ordenar manualmente por fecha (más reciente primero)
            attendances.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            
            console.log(`✅ ${attendances.length} asistencias encontradas en: ${location.ref.path}`);
            return attendances.slice(0, limitCount);
          }
        } catch (error) {
          console.log(`⚠️ Error en ${location.ref.path}:`, error);
          continue;
        }
      }
      
      console.log('ℹ️ No se encontraron asistencias en ninguna ubicación');
      return [];
      
    } catch (error) {
      console.error('❌ Error obteniendo asistencias:', error);
      return [];
    }
  },

  // Obtener pagos del miembro (CORREGIDO)
  getMemberPayments: async (gymId: string, memberId: string): Promise<PaymentRecord[]> => {
    try {
      console.log('💰 Obteniendo pagos del miembro (modo corregido)...');
      
      // Solo usar ubicaciones que sabemos que existen
      const paymentLocations = [
        // Ubicación 1: subscriptionPayments global (SOLO ESTA)
        { ref: collection(db, 'subscriptionPayments'), needsFilter: true }
        // Eliminamos la ruta inválida que causaba el error
      ];

      for (const location of paymentLocations) {
        try {
          let q;
          
          if (location.needsFilter) {
            // Para collections globales, filtrar por memberId
            q = query(
              location.ref,
              where('memberId', '==', memberId),
              limit(10)
            );
          } else {
            // Para subcollections, query simple
            q = query(
              location.ref,
              limit(10)
            );
          }

          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const payments: PaymentRecord[] = [];
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              payments.push({
                id: doc.id,
                amount: data.amount || 0,
                date: data.date || data.dueDate || Timestamp.now(),
                concept: data.concept || 'Pago de membresía',
                status: data.status || 'pending',
                memberId: data.memberId || memberId,
                paymentMethod: data.paymentMethod
              });
            });
            
            // Ordenar manualmente por fecha
            payments.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            
            console.log(`✅ ${payments.length} pagos encontrados en: ${location.ref.path}`);
            return payments;
          }
        } catch (error) {
          console.log(`⚠️ Error en ${location.ref.path}:`, error);
          continue;
        }
      }
      
      console.log('ℹ️ No se encontraron pagos en ninguna ubicación');
      return [];
      
    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      return [];
    }
  },

  // Obtener detalles de la membresía (SIMPLIFICADO)
  getMembershipDetails: async (gymId: string, memberId: string): Promise<MembershipDetails | null> => {
    try {
      console.log('🎫 Obteniendo detalles de membresía (modo simplificado)...');
      
      // Primero intentar membershipAssignments con query simple
      try {
        const assignmentsRef = collection(db, 'membershipAssignments');
        const q = query(
          assignmentsRef,
          where('memberId', '==', memberId),
          limit(5) // Limitar para evitar problemas
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Buscar uno activo
          for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            
            if (data.status === 'active') {
              const planName = data.activityName || data.planName || 'Plan Básico';
              const monthlyFee = data.cost || 0;
              
              const membership: MembershipDetails = {
                type: 'Membresía',
                status: 'active',
                startDate: data.startDate || Timestamp.now(),
                endDate: data.endDate || Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
                plan: planName,
                monthlyFee: monthlyFee
              };
              
              console.log('✅ Membresía activa encontrada en membershipAssignments');
              return membership;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error en membershipAssignments:', error);
      }

      // Luego intentar datos básicos del miembro
      try {
        const memberRef = doc(db, 'gyms', gymId, 'members', memberId);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          
          const membership: MembershipDetails = {
            type: 'Membresía Básica',
            status: memberData.status === 'active' ? 'active' : 'expired',
            startDate: memberData.createdAt || Timestamp.now(),
            endDate: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
            plan: 'Plan Estándar',
            monthlyFee: 0
          };
          
          console.log('✅ Datos básicos del miembro obtenidos');
          return membership;
        }
      } catch (error) {
        console.log('⚠️ Error obteniendo datos del miembro:', error);
      }
      
      console.log('❌ No se encontró información de membresía');
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo membresía:', error);
      return null;
    }
  },

  // Contar visitas del mes actual (SIMPLIFICADO)
  getMonthlyVisitCount: async (gymId: string, memberId: string): Promise<number> => {
    try {
      console.log('📈 Contando visitas del mes (modo simplificado)...');
      
      // Obtener asistencias sin filtro de fecha para evitar índices complejos
      const monthlyAttendances = await memberDataService.getRecentAttendance(gymId, memberId, 100);
      
      if (monthlyAttendances.length === 0) {
        console.log('✅ 0 visitas este mes (sin datos)');
        return 0;
      }
      
      // Filtrar por mes actual en JavaScript
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthAttendances = monthlyAttendances.filter(attendance => {
        const attendanceDate = attendance.date.toDate();
        return attendanceDate >= startOfMonth;
      });
      
      // Contar solo check-ins únicos por día
      const uniqueDays = new Set();
      thisMonthAttendances.forEach(attendance => {
        if (attendance.type === 'check-in') {
          const dayKey = attendance.date.toDate().toDateString();
          uniqueDays.add(dayKey);
        }
      });
      
      const count = uniqueDays.size;
      console.log(`✅ ${count} visitas únicas este mes`);
      return count;
      
    } catch (error) {
      console.error('❌ Error contando visitas:', error);
      return 0;
    }
  },

  // Contar visitas de esta semana (SIMPLIFICADO)
  getWeeklyVisitCount: async (gymId: string, memberId: string): Promise<number> => {
    try {
      const weeklyAttendances = await memberDataService.getRecentAttendance(gymId, memberId, 50);
      
      if (weeklyAttendances.length === 0) {
        return 0;
      }
      
      const now = new Date();
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const thisWeekAttendances = weeklyAttendances.filter(attendance => {
        const attendanceDate = attendance.date.toDate();
        return attendanceDate >= startOfWeek;
      });
      
      const uniqueDays = new Set();
      thisWeekAttendances.forEach(attendance => {
        if (attendance.type === 'check-in') {
          const dayKey = attendance.date.toDate().toDateString();
          uniqueDays.add(dayKey);
        }
      });
      
      return uniqueDays.size;
      
    } catch (error) {
      console.error('❌ Error contando visitas semanales:', error);
      return 0;
    }
  },

  // Obtener próximo pago pendiente (SIMPLIFICADO)
  getNextPendingPayment: async (memberId: string): Promise<PaymentRecord | null> => {
    try {
      console.log('💳 Buscando próximo pago pendiente (modo simplificado)...');
      
      // Obtener pagos sin filtros complejos
      const payments = await memberDataService.getMemberPayments('', memberId);
      
      if (payments.length === 0) {
        console.log('ℹ️ No hay pagos en el sistema');
        return null;
      }
      
      // Filtrar pagos pendientes en JavaScript
      const pendingPayments = payments
        .filter(payment => payment.status === 'pending' || payment.status === 'overdue')
        .sort((a, b) => a.date.toMillis() - b.date.toMillis());
      
      if (pendingPayments.length > 0) {
        console.log('✅ Próximo pago pendiente encontrado');
        return pendingPayments[0];
      }
      
      console.log('ℹ️ No hay pagos pendientes');
      return null;
      
    } catch (error) {
      console.error('❌ Error buscando próximo pago:', error);
      return null;
    }
  },

  // Obtener datos completos del dashboard (SIMPLIFICADO)
  getDashboardData: async (gymId: string, memberId: string): Promise<MemberDashboardData> => {
    try {
      console.log('📊 Obteniendo datos completos del dashboard (modo simplificado)...');
      
      // Cargar datos de forma secuencial para evitar problemas
      let monthlyVisits = 0;
      let weeklyVisits = 0;
      let recentAttendances: AttendanceRecord[] = [];
      let nextPayment: PaymentRecord | null = null;
      let membershipDetails: MembershipDetails | null = null;

      try {
        monthlyVisits = await memberDataService.getMonthlyVisitCount(gymId, memberId);
      } catch (error) {
        console.log('⚠️ Error obteniendo visitas mensuales:', error);
      }

      try {
        weeklyVisits = await memberDataService.getWeeklyVisitCount(gymId, memberId);
      } catch (error) {
        console.log('⚠️ Error obteniendo visitas semanales:', error);
      }

      try {
        recentAttendances = await memberDataService.getRecentAttendance(gymId, memberId, 5);
      } catch (error) {
        console.log('⚠️ Error obteniendo asistencias recientes:', error);
      }

      try {
        nextPayment = await memberDataService.getNextPendingPayment(memberId);
      } catch (error) {
        console.log('⚠️ Error obteniendo próximo pago:', error);
      }

      try {
        membershipDetails = await memberDataService.getMembershipDetails(gymId, memberId);
      } catch (error) {
        console.log('⚠️ Error obteniendo detalles de membresía:', error);
      }

      // Obtener datos del miembro para fecha de registro
      let memberSince: Date | null = null;
      try {
        const memberRef = doc(db, 'gyms', gymId, 'members', memberId);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          memberSince = memberData.createdAt?.toDate() || null;
        }
      } catch (error) {
        console.log('⚠️ Error obteniendo fecha de registro:', error);
      }

      const dashboardData: MemberDashboardData = {
        totalVisitsThisMonth: monthlyVisits,
        totalVisitsThisWeek: weeklyVisits,
        lastVisitDate: recentAttendances.length > 0 ? recentAttendances[0].date.toDate() : null,
        nextPaymentDue: nextPayment,
        totalDebt: nextPayment?.amount || 0,
        membershipStatus: membershipDetails?.status || 'active',
        memberSince: memberSince
      };

      console.log('✅ Datos del dashboard obtenidos (modo simplificado):', dashboardData);
      return dashboardData;
      
    } catch (error) {
      console.error('❌ Error obteniendo datos del dashboard:', error);
      return {
        totalVisitsThisMonth: 0,
        totalVisitsThisWeek: 0,
        lastVisitDate: null,
        nextPaymentDue: null,
        totalDebt: 0,
        membershipStatus: 'active',
        memberSince: null
      };
    }
  },

  // Verificar conectividad con Firebase
  testFirebaseConnection: async (): Promise<boolean> => {
    try {
      console.log('🔍 Verificando conexión con Firebase...');
      
      const gymsRef = collection(db, 'gyms');
      const testQuery = query(gymsRef, limit(1));
      await getDocs(testQuery);
      
      console.log('✅ Conexión con Firebase exitosa');
      return true;
      
    } catch (error) {
      console.error('❌ Error de conexión con Firebase:', error);
      return false;
    }
  }
};