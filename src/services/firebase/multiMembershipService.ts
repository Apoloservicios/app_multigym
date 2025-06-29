// src/services/firebase/multiMembershipService.ts - VERSIÓN LIMPIA Y COMPLETA
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
  addDoc,
  updateDoc
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

export interface RoutineInfo {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  goal: string;
  duration: number;
  exercises: any;
  isActive: boolean;
  assignedDate?: Timestamp;
}

export const multiMembershipService = {
  // 🎫 Obtener membresías reales del usuario - CORREGIDO PARA TU ESTRUCTURA
  getUserMemberships: async (memberId: string): Promise<MembershipInfo[]> => {
    try {
      console.log('🎫 Obteniendo membresías REALES del usuario:', memberId);
      
      const memberships: MembershipInfo[] = [];
      
      // Buscar en todos los gimnasios
      const gymsRef = collection(db, 'gyms');
      const gymsSnapshot = await getDocs(gymsRef);
      
      for (const gymDoc of gymsSnapshot.docs) {
        const gymData = gymDoc.data();
        const gymId = gymDoc.id;
        
        // Buscar miembro en este gimnasio
        const membersRef = collection(db, 'gyms', gymId, 'members');
        const memberQuery = query(membersRef, where('userId', '==', memberId));
        const memberSnapshot = await getDocs(memberQuery);
        
        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          const memberData = memberDoc.data();
          
          console.log('👤 Miembro encontrado en gimnasio:', gymData.name);
          
          // 🎯 BUSCAR EN LA SUBCOLECCIÓN REAL: memberships
          try {
            console.log('📋 Buscando en subcolección memberships del miembro...');
            const membershipRef = collection(db, 'gyms', gymId, 'members', memberDoc.id, 'memberships');
            const membershipSnapshot = await getDocs(membershipRef);
            
            console.log(`📋 Encontradas ${membershipSnapshot.size} membresías en subcolección`);
            
            membershipSnapshot.forEach((membershipDoc) => {
              const membershipData = membershipDoc.data();
              
              console.log('📋 Procesando membresía:', membershipData);
              
              // Convertir fechas string a Timestamp
              let startDate = Timestamp.now();
              let endDate = Timestamp.now();
              
              if (membershipData.startDate) {
                if (typeof membershipData.startDate === 'string') {
                  startDate = Timestamp.fromDate(new Date(membershipData.startDate));
                } else {
                  startDate = membershipData.startDate;
                }
              }
              
              if (membershipData.endDate) {
                if (typeof membershipData.endDate === 'string') {
                  endDate = Timestamp.fromDate(new Date(membershipData.endDate));
                } else {
                  endDate = membershipData.endDate;
                }
              }
              
              // Determinar estado real basado en los datos
              let status: 'active' | 'expired' | 'suspended' = 'active';
              if (membershipData.status === 'active') {
                status = 'active';
              } else if (membershipData.status === 'expired') {
                status = 'expired';
              } else if (membershipData.status === 'suspended' || membershipData.status === 'inactive') {
                status = 'suspended';
              }
              
              // Calcular deuda
              const totalDebt = memberData.totalDebt || 0;
              const cost = membershipData.cost || 0;
              const paidAmount = membershipData.paidAmount || 0;
              const pendingAmount = cost - paidAmount;
              
              memberships.push({
                id: membershipDoc.id,
                memberId: memberDoc.id,
                gymId: gymId,
                gymName: gymData.name || 'Gimnasio',
                planType: membershipData.activityName || 'Membresía',
                status: status,
                startDate: startDate,
                endDate: endDate,
                monthlyFee: cost,
                totalDebt: Math.max(0, pendingAmount)
              });
            });
            
          } catch (error) {
            console.log('⚠️ Error buscando membresías en subcolección:', error);
          }
        }
      }
      
      console.log(`✅ ${memberships.length} membresías reales encontradas`);
      return memberships;
      
    } catch (error) {
      console.error('❌ Error obteniendo membresías:', error);
      return [];
    }
  },

  // 📅 Obtener asistencias reales - CORREGIDO PARA TU ESTRUCTURA
  getMembershipAttendance: async (membershipId: string, limitCount: number = 10): Promise<MembershipAttendance[]> => {
    try {
      console.log('📊 Obteniendo asistencias REALES de membresía:', membershipId);
      
      const attendances: MembershipAttendance[] = [];
      
      // Buscar asistencias en la estructura real
      try {
        // Primero intentar buscar en collection global de attendances
        const attendanceRef = collection(db, 'attendances');
       const q = query(
          attendanceRef,
          where('membershipId', '==', membershipId),
          limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          let timeString = '00:00';
          if (data.time) {
            timeString = data.time;
          } else if (data.hora) {
            timeString = data.hora;
          } else if (data.date && data.date.toDate) {
            const dateObj = data.date.toDate();
            timeString = dateObj.toLocaleTimeString('es-AR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
          
          attendances.push({
            id: docSnap.id,
            membershipId: membershipId,
            date: data.date || data.fecha || Timestamp.now(),
            time: timeString,
            type: data.type || 'check-in'
          });
        });
        
        // Si no hay asistencias globales, buscar en subcolecciones del miembro
        if (attendances.length === 0) {
          console.log('📅 Buscando asistencias en subcolecciones del miembro...');
          
          // Buscar en todas las membresías para encontrar asistencias
          const gymsRef = collection(db, 'gyms');
          const gymsSnapshot = await getDocs(gymsRef);
          
          for (const gymDoc of gymsSnapshot.docs) {
            const membersRef = collection(db, 'gyms', gymDoc.id, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            for (const memberDoc of membersSnapshot.docs) {
              // Buscar en attendance del miembro
              try {
                const memberAttendanceRef = collection(db, 'gyms', gymDoc.id, 'members', memberDoc.id, 'attendance');
                const attendanceSnapshot = await getDocs(query(memberAttendanceRef, orderBy('date', 'desc'), limit(limitCount)));
                
                attendanceSnapshot.forEach((docSnap) => {
                  const data = docSnap.data();
                  attendances.push({
                    id: docSnap.id,
                    membershipId: membershipId,
                    date: data.date || Timestamp.now(),
                    time: data.time || data.hora || '00:00',
                    type: 'check-in'
                  });
                });
                
                if (attendances.length > 0) break;
              } catch (error) {
                console.log('⚠️ Error buscando asistencias del miembro:', error);
              }
            }
            if (attendances.length > 0) break;
          }
        }
        
      } catch (error) {
        console.log('⚠️ Error en búsqueda de asistencias:', error);
      }
      
      console.log(`✅ ${attendances.length} asistencias encontradas`);
      return attendances;
      
    } catch (error) {
      console.error('❌ Error obteniendo asistencias:', error);
      return [];
    }
  },

  // 💰 Obtener pagos reales - BASADO EN LA ESTRUCTURA DE MEMBERSHIPS
  getMembershipPayments: async (membershipId: string, limitCount: number = 5): Promise<MembershipPayment[]> => {
    try {
      console.log('💰 Obteniendo pagos REALES de membresía:', membershipId);
      
      const payments: MembershipPayment[] = [];
      
      // Buscar la membresía específica para obtener info de pagos
      try {
        const gymsRef = collection(db, 'gyms');
        const gymsSnapshot = await getDocs(gymsRef);
        
        for (const gymDoc of gymsSnapshot.docs) {
          const membersRef = collection(db, 'gyms', gymDoc.id, 'members');
          const membersSnapshot = await getDocs(membersRef);
          
          for (const memberDoc of membersSnapshot.docs) {
            const membershipRef = doc(db, 'gyms', gymDoc.id, 'members', memberDoc.id, 'memberships', membershipId);
            const membershipDoc = await getDoc(membershipRef);
            
            if (membershipDoc.exists()) {
              const membershipData = membershipDoc.data();
              
              // Crear información de pago basada en la membresía
              let status: 'paid' | 'pending' | 'overdue' = 'pending';
              if (membershipData.paymentStatus === 'paid') {
                status = 'paid';
              } else if (membershipData.paymentStatus === 'pending') {
                // Verificar si está vencido
                const endDate = new Date(membershipData.endDate);
                if (endDate < new Date()) {
                  status = 'overdue';
                } else {
                  status = 'pending';
                }
              }
              
              const paymentDate = membershipData.paidAt || membershipData.createdAt || Timestamp.now();
              
              payments.push({
                id: membershipDoc.id,
                membershipId: membershipId,
                amount: membershipData.cost || 0,
                date: paymentDate,
                concept: `Cuota - ${membershipData.activityName || 'Membresía'}`,
                status: status
              });
              
              return payments; // Encontramos la membresía, salir
            }
          }
        }
        
      } catch (error) {
        console.log('⚠️ Error en búsqueda de pagos:', error);
      }
      
      console.log(`✅ ${payments.length} pagos encontrados`);
      return payments;
      
    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error);
      return [];
    }
  },

  // 🏋️ Obtener rutinas reales
  getUserRoutines: async (memberId: string, gymId: string): Promise<RoutineInfo[]> => {
    try {
      console.log('🏋️ Obteniendo rutinas REALES del usuario:', memberId);
      
      const routines: RoutineInfo[] = [];
      
      try {
        const memberRoutinesRef = collection(db, 'memberRoutines');
        const q = query(
          memberRoutinesRef,
          where('memberId', '==', memberId),
          where('gymId', '==', gymId),
          where('isActive', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        
        for (const docSnap of querySnapshot.docs) {
          const assignmentData = docSnap.data();
          
          if (assignmentData.routineId) {
            try {
              const routineRef = doc(db, 'routines', assignmentData.routineId);
              const routineDoc = await getDoc(routineRef);
              
              if (routineDoc.exists()) {
                const routineData = routineDoc.data();
                
                routines.push({
                  id: routineDoc.id,
                  name: routineData.name || 'Rutina Sin Nombre',
                  description: routineData.description || '',
                  level: routineData.level || 'beginner',
                  daysPerWeek: routineData.daysPerWeek || 3,
                  goal: routineData.goal || 'Fitness general',
                  duration: routineData.duration || 4,
                  exercises: routineData.exercises || {},
                  isActive: routineData.isActive !== false,
                  assignedDate: assignmentData.assignedDate || Timestamp.now()
                });
              }
            } catch (error) {
              console.log('⚠️ Error obteniendo rutina:', error);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error en búsqueda de rutinas:', error);
      }
      
      console.log(`✅ ${routines.length} rutinas encontradas`);
      return routines;
      
    } catch (error) {
      console.error('❌ Error obteniendo rutinas:', error);
      return [];
    }
  },

  // ✅ Registrar asistencia real - CORREGIDO PARA TU ESTRUCTURA
  registerAttendance: async (membershipId: string, gymId: string): Promise<boolean> => {
    try {
      console.log('📝 Registrando asistencia REAL...');
      console.log('📝 MembershipId:', membershipId, 'GymId:', gymId);
      
      const now = new Date();
      
      // Buscar el miembro al que pertenece esta membresía
      const membersRef = collection(db, 'gyms', gymId, 'members');
      const membersSnapshot = await getDocs(membersRef);
      
      let memberIdFound = null;
      
      for (const memberDoc of membersSnapshot.docs) {
        const membershipRef = doc(db, 'gyms', gymId, 'members', memberDoc.id, 'memberships', membershipId);
        const membershipDoc = await getDoc(membershipRef);
        
        if (membershipDoc.exists()) {
          memberIdFound = memberDoc.id;
          break;
        }
      }
      
      if (!memberIdFound) {
        console.log('❌ No se encontró el miembro para esta membresía');
        return false;
      }
      
      // Registrar asistencia en subcolección del miembro
      const attendanceData = {
        membershipId: membershipId,
        memberId: memberIdFound,
        gymId: gymId,
        date: Timestamp.fromDate(now),
        time: now.toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        hora: now.toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        type: 'check-in',
        createdAt: Timestamp.now(),
        deviceInfo: 'Mobile App',
        source: 'app_movil'
      };
      
      // Registrar en subcolección attendance del miembro
      const memberAttendanceRef = collection(db, 'gyms', gymId, 'members', memberIdFound, 'attendance');
      await addDoc(memberAttendanceRef, attendanceData);
      
      // También registrar en colección global si existe
      try {
        const globalAttendanceRef = collection(db, 'attendances');
        await addDoc(globalAttendanceRef, attendanceData);
      } catch (error) {
        console.log('⚠️ No se pudo registrar en asistencias globales, pero sí en el miembro');
      }
      
      // Actualizar contador de asistencias en la membresía
      try {
        const membershipRef = doc(db, 'gyms', gymId, 'members', memberIdFound, 'memberships', membershipId);
        const membershipDoc = await getDoc(membershipRef);
        
        if (membershipDoc.exists()) {
          const membershipData = membershipDoc.data();
          const currentAttendances = (membershipData.currentAttendances || 0) + 1;
          
          await updateDoc(membershipRef, {
            currentAttendances: currentAttendances,
            lastAttendance: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          
          console.log('✅ Contador de asistencias actualizado:', currentAttendances);
        }
      } catch (error) {
        console.log('⚠️ Error actualizando contador de asistencias:', error);
      }
      
      console.log('✅ Asistencia registrada exitosamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error registrando asistencia:', error);
      return false;
    }
  },

  // 📈 Obtener estadísticas reales
  getMonthlyStats: async (memberId: string): Promise<{
    totalVisits: number;
    thisMonthVisits: number;
    thisWeekVisits: number;
    averageVisitsPerWeek: number;
  }> => {
    try {
      console.log('📈 Calculando estadísticas REALES...');
      
      const memberships = await multiMembershipService.getUserMemberships(memberId);
      
      let totalVisits = 0;
      let thisMonthVisits = 0;
      let thisWeekVisits = 0;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      for (const membership of memberships) {
        const attendances = await multiMembershipService.getMembershipAttendance(membership.id, 200);
        
        attendances.forEach(attendance => {
          const attDate = attendance.date.toDate();
          totalVisits++;
          
          if (attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear) {
            thisMonthVisits++;
          }
          
          if (attDate >= startOfWeek) {
            thisWeekVisits++;
          }
        });
      }
      
      const averageVisitsPerWeek = Math.round(thisMonthVisits / 4);
      
      console.log('✅ Estadísticas calculadas:', {
        totalVisits,
        thisMonthVisits,
        thisWeekVisits,
        averageVisitsPerWeek
      });
      
      return {
        totalVisits,
        thisMonthVisits,
        thisWeekVisits,
        averageVisitsPerWeek
      };
      
    } catch (error) {
      console.error('❌ Error calculando estadísticas:', error);
      return {
        totalVisits: 0,
        thisMonthVisits: 0,
        thisWeekVisits: 0,
        averageVisitsPerWeek: 0
      };
    }
  },

  // 🕐 Obtener horarios del gimnasio
  getGymSchedule: async (gymId: string): Promise<any[]> => {
    try {
      console.log('🕐 Obteniendo horarios del gimnasio:', gymId);
      
      const gymRef = doc(db, 'gyms', gymId);
      const gymDoc = await getDoc(gymRef);
      
      if (gymDoc.exists()) {
        const gymData = gymDoc.data();
        return gymData.schedule || gymData.horarios || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error obteniendo horarios:', error);
      return [];
    }
  },

  // 🏢 Obtener información del gimnasio
  getGymInfo: async (gymId: string): Promise<any> => {
    try {
      console.log('🏢 Obteniendo información del gimnasio:', gymId);
      
      const gymRef = doc(db, 'gyms', gymId);
      const gymDoc = await getDoc(gymRef);
      
      if (gymDoc.exists()) {
        const gymData = gymDoc.data();
        return {
          id: gymDoc.id,
          name: gymData.name || gymData.nombre || 'Gimnasio',
          address: gymData.address || gymData.direccion || '',
          phone: gymData.phone || gymData.telefono || '',
          email: gymData.email || gymData.correo || '',
          schedule: gymData.schedule || gymData.horarios || [],
          services: gymData.services || gymData.servicios || [],
          rules: gymData.rules || gymData.reglas || []
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error obteniendo info del gimnasio:', error);
      return null;
    }
  },

  // ⏰ Obtener próximos vencimientos
  getUpcomingExpirations: async (memberId: string): Promise<{
    membershipExpiry?: Date;
    paymentDue?: Date;
    daysUntilExpiry: number;
    daysUntilPayment: number;
  }> => {
    try {
      console.log('⏰ Verificando próximos vencimientos...');
      
      const memberships = await multiMembershipService.getUserMemberships(memberId);
      const activeMembership = memberships.find(m => m.status === 'active');
      
      if (!activeMembership) {
        return {
          daysUntilExpiry: 0,
          daysUntilPayment: 0
        };
      }
      
      const membershipExpiry = activeMembership.endDate.toDate();
      const now = new Date();
      const daysUntilExpiry = Math.ceil((membershipExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const payments = await multiMembershipService.getMembershipPayments(activeMembership.id, 1);
      const nextPayment = payments.find(p => p.status === 'pending');
      
      let paymentDue: Date | undefined;
      let daysUntilPayment = 0;
      
      if (nextPayment) {
        paymentDue = nextPayment.date.toDate();
        daysUntilPayment = Math.ceil((paymentDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      console.log('✅ Vencimientos calculados:', {
        daysUntilExpiry,
        daysUntilPayment
      });
      
      return {
        membershipExpiry,
        paymentDue,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        daysUntilPayment: Math.max(0, daysUntilPayment)
      };
      
    } catch (error) {
      console.error('❌ Error calculando vencimientos:', error);
      return {
        daysUntilExpiry: 0,
        daysUntilPayment: 0
      };
    }
  },

  // 🔍 Debug: Buscar miembro por userId - VERSIÓN MEJORADA
  debugFindMemberByUserId: async (userId: string): Promise<any> => {
    try {
      console.log('🔍 DEBUG: Buscando miembro por userId:', userId);
      
      const gymsRef = collection(db, 'gyms');
      const gymsSnapshot = await getDocs(gymsRef);
      
      for (const gymDoc of gymsSnapshot.docs) {
        const gymData = gymDoc.data();
        console.log('🏢 Buscando en gimnasio:', gymData.name);
        
        const membersRef = collection(db, 'gyms', gymDoc.id, 'members');
        const memberQuery = query(membersRef, where('userId', '==', userId));
        const memberSnapshot = await getDocs(memberQuery);
        
        if (!memberSnapshot.empty) {
          const memberDoc = memberSnapshot.docs[0];
          const memberData = memberDoc.data();
          
          console.log('✅ MIEMBRO ENCONTRADO:', {
            memberId: memberDoc.id,
            gymId: gymDoc.id,
            gymName: gymData.name,
            memberData: {
              firstName: memberData.firstName,
              lastName: memberData.lastName,
              email: memberData.email,
              phone: memberData.phone,
              userId: memberData.userId
            }
          });
          
          // 🔍 INVESTIGAR ESTRUCTURA COMPLETA
          console.log('🔬 INVESTIGANDO ESTRUCTURA DE DATOS COMPLETA...');
          
          // 1. Buscar membershipAssignments globales
          try {
            console.log('📋 1. Buscando en membershipAssignments global...');
            const assignmentsRef = collection(db, 'membershipAssignments');
            const assignmentQuery = query(assignmentsRef, where('memberId', '==', memberDoc.id));
            const assignmentSnapshot = await getDocs(assignmentQuery);
            
            console.log(`📋 Encontradas ${assignmentSnapshot.size} asignaciones globales`);
            assignmentSnapshot.forEach((doc) => {
              console.log(`📋 Asignación:`, doc.data());
            });
          } catch (error) {
            console.log('❌ Error en membershipAssignments global:', error);
          }
          
          // 2. Buscar en subcolección del gimnasio
          try {
            console.log('🏢 2. Buscando en subcolección del gimnasio...');
            const gymAssignmentsRef = collection(db, 'gyms', gymDoc.id, 'membershipAssignments');
            const gymAssignmentSnapshot = await getDocs(gymAssignmentsRef);
            
            console.log(`🏢 Encontradas ${gymAssignmentSnapshot.size} asignaciones en gimnasio`);
            gymAssignmentSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`🏢 Asignación:`, data);
              if (data.memberId === memberDoc.id) {
                console.log('🎯 MATCH! Esta asignación es para nuestro miembro');
              }
            });
          } catch (error) {
            console.log('❌ Error en asignaciones del gimnasio:', error);
          }
          
          // 3. Buscar actividades del miembro
          try {
            console.log('🏃 3. Buscando actividades del miembro...');
            const activitiesRef = collection(db, 'gyms', gymDoc.id, 'activities');
            const activitiesSnapshot = await getDocs(activitiesRef);
            
            console.log(`🏃 Encontradas ${activitiesSnapshot.size} actividades en gimnasio`);
            activitiesSnapshot.forEach((doc) => {
              console.log(`🏃 Actividad:`, doc.data());
            });
          } catch (error) {
            console.log('❌ Error en actividades:', error);
          }
          
          // 4. Buscar asistencias
          try {
            console.log('📅 4. Buscando asistencias...');
            const attendancesRef = collection(db, 'attendances');
            const attendanceQuery = query(attendancesRef, where('memberId', '==', memberDoc.id));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            
            console.log(`📅 Encontradas ${attendanceSnapshot.size} asistencias globales`);
            attendanceSnapshot.forEach((doc) => {
              console.log(`📅 Asistencia:`, doc.data());
            });
            
            // También buscar en subcolección del gimnasio
            const gymAttendancesRef = collection(db, 'gyms', gymDoc.id, 'attendances');
            const gymAttendanceSnapshot = await getDocs(gymAttendancesRef);
            
            console.log(`📅 Encontradas ${gymAttendanceSnapshot.size} asistencias en gimnasio`);
            gymAttendanceSnapshot.forEach((doc) => {
              const data = doc.data();
              console.log(`📅 Asistencia gimnasio:`, data);
            });
          } catch (error) {
            console.log('❌ Error en asistencias:', error);
          }
          
          // 5. Explorar subcolecciones del miembro
          try {
            console.log('🔎 5. Explorando subcolecciones del miembro...');
            const memberRef = doc(db, 'gyms', gymDoc.id, 'members', memberDoc.id);
            
            const commonSubcollections = ['memberships', 'subscriptions', 'plans', 'activities', 'attendance', 'payments'];
            
            for (const subcollection of commonSubcollections) {
              try {
                const subRef = collection(memberRef, subcollection);
                const subSnapshot = await getDocs(subRef);
                
                if (subSnapshot.size > 0) {
                  console.log(`✅ Subcolección '${subcollection}' encontrada con ${subSnapshot.size} documentos:`);
                  subSnapshot.forEach((doc) => {
                    console.log(`${subcollection}:`, doc.data());
                  });
                }
              } catch (error) {
                console.log(`⚠️ Subcolección '${subcollection}' no accesible:`, error);
              }
            }
          } catch (error) {
            console.log('❌ Error explorando subcolecciones:', error);
          }
          
          return {
            memberId: memberDoc.id,
            gymId: gymDoc.id,
            gymName: gymData.name,
            memberData: memberData,
            investigationCompleted: true
          };
        }
      }
      
      console.log('❌ No se encontró miembro con userId:', userId);
      return null;
      
    } catch (error) {
      console.error('❌ Error en debug de búsqueda:', error);
      return null;
    }
  },

  // 🔬 Investigar estructura de membershipAssignments
  debugMembershipAssignments: async (memberId: string): Promise<any> => {
    try {
      console.log('🔬 INVESTIGANDO ESTRUCTURA DE MEMBERSHIPS...');
      console.log('👤 Member ID:', memberId);
      
      // Método 1: Buscar por memberId
      console.log('📋 Método 1: Buscar por memberId');
      try {
        const assignmentsRef = collection(db, 'membershipAssignments');
        const q1 = query(assignmentsRef, where('memberId', '==', memberId));
        const snapshot1 = await getDocs(q1);
        
        console.log(`📋 Encontradas ${snapshot1.size} con memberId = ${memberId}`);
        snapshot1.forEach((doc) => {
          console.log(`📋 Resultado:`, doc.data());
        });
      } catch (error) {
        console.log('❌ Error método 1:', error);
      }
      
      // Método 2: Buscar por member (sin Id)
      console.log('📋 Método 2: Buscar por member');
      try {
        const assignmentsRef = collection(db, 'membershipAssignments');
        const q2 = query(assignmentsRef, where('member', '==', memberId));
        const snapshot2 = await getDocs(q2);
        
        console.log(`📋 Encontradas ${snapshot2.size} con member = ${memberId}`);
        snapshot2.forEach((doc) => {
          console.log(`📋 Resultado:`, doc.data());
        });
      } catch (error) {
        console.log('❌ Error método 2:', error);
      }
      
      // Método 3: Buscar por userId
      console.log('📋 Método 3: Buscar por userId');
      try {
        const assignmentsRef = collection(db, 'membershipAssignments');
        const q3 = query(assignmentsRef, where('userId', '==', memberId));
        const snapshot3 = await getDocs(q3);
        
        console.log(`📋 Encontradas ${snapshot3.size} con userId = ${memberId}`);
        snapshot3.forEach((doc) => {
          console.log(`📋 Resultado:`, doc.data());
        });
      } catch (error) {
        console.log('❌ Error método 3:', error);
      }
      
      // Método 4: Listar TODOS los membershipAssignments para ver estructura
      console.log('📋 Método 4: Listar TODOS (primeros 10)');
      try {
        const assignmentsRef = collection(db, 'membershipAssignments');
        const q4 = query(assignmentsRef, limit(10));
        const snapshot4 = await getDocs(q4);
        
        console.log(`📋 Documentos totales encontrados: ${snapshot4.size}`);
        snapshot4.forEach((doc) => {
          console.log(`📋 Documento ID: ${doc.id}`);
          console.log(`📋 Documento Data:`, doc.data());
        });
      } catch (error) {
        console.log('❌ Error método 4:', error);
      }
      
      return { investigation: 'completed' };
      
    } catch (error) {
      console.error('❌ Error en investigación de memberships:', error);
      return null;
    }
  }
};