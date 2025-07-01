// src/services/firebase/multiMembershipService.ts - COMPLETO ACTUALIZADO
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp,
  doc,
 getDoc,
  addDoc,    // 🆕 AGREGAR
  updateDoc  // 🆕 AGREGAR
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

// 🆕 NUEVA INTERFACE PARA RUTINAS
export interface RoutineInfo {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  duration: number;
  goal: string;
  exercises: { [key: string]: any[] };
  status: 'active' | 'completed' | 'cancelled';
  startDate: Timestamp;
  endDate: Timestamp;
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
        const status = data.status === 'active' ? 
                      'active' : 
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
      console.log('\n📊 3. Verificando attendances globales...');
      const attendancesRef = collection(db, 'attendances');
      const attendancesQuery = query(
        attendancesRef, 
        where('memberId', '==', memberId),
        orderBy('date', 'desc'),
        limit(5)
      );
      const attendancesSnapshot = await getDocs(attendancesQuery);
      
      console.log(`📈 Attendances encontradas: ${attendancesSnapshot.size}`);
      attendancesSnapshot.docs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.id}:`, doc.data());
      });
      
      return {
        membershipAssignments: assignmentsSnapshot.size,
        subscriptionPlans: plansSnapshot.size,
        attendances: attendancesSnapshot.size,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error en debug de membresías:', error);
      return {
        membershipAssignments: 0,
        subscriptionPlans: 0,
        attendances: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  },

  // 🆕 NUEVA FUNCIÓN: Obtener rutinas del usuario
  getUserRoutines: async (memberId: string, gymId: string): Promise<RoutineInfo[]> => {
    try {
      console.log('🏋️ Obteniendo rutinas del usuario:', memberId, 'en gimnasio:', gymId);
      
      // Buscar en memberRoutines del gimnasio (como en tu estructura web)
      const memberRoutinesRef = collection(db, `gyms/${gymId}/memberRoutines`);
      const q = query(
        memberRoutinesRef,
        where('memberId', '==', memberId)
      );
      
      const querySnapshot = await getDocs(q);
      const routines: RoutineInfo[] = [];
      
      console.log(`📋 ${querySnapshot.size} rutinas encontradas`);
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        
        // Obtener detalles de la rutina base si existe routineId
        let routineDetails = null;
        let exercises = {};
        
        if (data.routineId) {
          try {
            const routineRef = doc(db, `gyms/${gymId}/routines`, data.routineId);
            const routineDoc = await getDoc(routineRef);
            if (routineDoc.exists()) {
              routineDetails = routineDoc.data();
              exercises = routineDetails.exercises || {};
            }
          } catch (error) {
            console.log('⚠️ Error obteniendo detalles de rutina:', error);
          }
        }
        
        routines.push({
          id: docSnap.id,
          name: data.routineName || routineDetails?.name || 'Rutina sin nombre',
          description: data.description || routineDetails?.description || '',
          level: routineDetails?.level || 'beginner',
          daysPerWeek: routineDetails?.daysPerWeek || 3,
          duration: routineDetails?.duration || 4,
          goal: routineDetails?.goal || 'Mantenimiento',
          exercises: exercises,
          status: data.status || 'active',
          startDate: data.startDate,
          endDate: data.endDate
        });
      }
      
      console.log(`✅ ${routines.length} rutinas cargadas`);
      return routines;
      
    } catch (error) {
      console.error('❌ Error obteniendo rutinas del usuario:', error);
      throw error;
    }
  },

  // 🆕 NUEVA FUNCIÓN: Debug para rutinas
  debugRoutineStructure: async (memberId: string, gymId: string) => {
    try {
      console.log('\n🔍 === DEBUG RUTINAS ===');
      console.log('👤 Member ID:', memberId);
      console.log('🏢 Gym ID:', gymId);
      
      // 1. Verificar memberRoutines del gimnasio
      console.log('\n📋 1. Verificando memberRoutines del gimnasio...');
      const memberRoutinesRef = collection(db, `gyms/${gymId}/memberRoutines`);
      const memberRoutinesQuery = query(
        memberRoutinesRef, 
        where('memberId', '==', memberId)
      );
      const memberRoutinesSnapshot = await getDocs(memberRoutinesQuery);
      
      console.log(`🎯 MemberRoutines encontradas: ${memberRoutinesSnapshot.size}`);
      memberRoutinesSnapshot.docs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.id}:`, doc.data());
      });
      
      // 2. Verificar rutinas base del gimnasio
      console.log('\n📋 2. Verificando rutinas base...');
      const routinesRef = collection(db, `gyms/${gymId}/routines`);
      const routinesSnapshot = await getDocs(routinesRef);
      console.log(`📊 Total rutinas base: ${routinesSnapshot.size}`);
      
      return {
        memberRoutinesCount: memberRoutinesSnapshot.size,
        totalRoutinesCount: routinesSnapshot.size,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Error en debug de rutinas:', error);
      return {
        memberRoutinesCount: 0,
        totalRoutinesCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }

  },
     // 🔧 FIX: Función registerAttendance con parámetros correctos
registerAttendance: async (membershipId: string, memberId: string): Promise<{ success: boolean; message: string; attendanceId?: string; error?: string }> => {
  try {
    console.log('📝 Registrando asistencia...');
    console.log('🎫 Membership ID:', membershipId);
    console.log('👤 Member ID:', memberId);
    
    // Primero obtener información de la membresía para saber el gymId
    const membershipRef = doc(db, 'membershipAssignments', membershipId);
    const membershipDoc = await getDoc(membershipRef);
    
    if (!membershipDoc.exists()) {
      return {
        success: false,
        message: 'Membresía no encontrada',
        error: 'Membership not found'
      };
    }
    
    const membershipData = membershipDoc.data();
    const gymId = membershipData.gymId;
    
    console.log('🏢 Gym ID extraído:', gymId);
    
    const now = new Date();
    const attendanceData = {
      membershipId: membershipId,
      memberId: memberId,
      gymId: gymId,
      date: Timestamp.fromDate(now),
      time: now.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: 'check-in',
      timestamp: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      // Datos adicionales de la membresía
      activityId: membershipData.activityId || '',
      activityName: membershipData.activityName || 'Actividad'
    };
    
    // 1. Registrar en attendances globales
    const globalAttendanceRef = collection(db, 'attendances');
    const globalDocRef = await addDoc(globalAttendanceRef, attendanceData);
    
    // 2. También registrar en la subcolección del miembro (si existe)
    try {
      const memberAttendanceRef = collection(db, `gyms/${gymId}/members/${memberId}/attendance`);
      await addDoc(memberAttendanceRef, attendanceData);
    } catch (error) {
      console.log('⚠️ No se pudo registrar en subcolección del miembro:', error);
      // No es crítico, continuar
    }
    
    // 3. Actualizar contador de asistencias en la membresía
    try {
      const newAttendanceCount = (membershipData.currentAttendances || 0) + 1;
      
      await updateDoc(membershipRef, {
        currentAttendances: newAttendanceCount,
        lastAttendance: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      
      console.log('✅ Contador de asistencias actualizado:', newAttendanceCount);
    } catch (error) {
      console.log('⚠️ Error actualizando contador de membresía:', error);
      // No es crítico, la asistencia ya se registró
    }
    
    console.log('✅ Asistencia registrada exitosamente:', globalDocRef.id);
    
    return {
      success: true,
      message: `Asistencia registrada para ${membershipData.activityName}`,
      attendanceId: globalDocRef.id
    };
    
  } catch (error) {
    console.error('❌ Error registrando asistencia:', error);
    return {
      success: false,
      message: 'Error al registrar asistencia',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}





};