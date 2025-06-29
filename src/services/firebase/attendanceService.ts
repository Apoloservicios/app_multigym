// src/services/firebase/attendanceService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  Timestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export interface AttendanceRecord {
  id?: string;
  memberId: string;
  gymId: string;
  memberName: string;
  date: Timestamp;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number; // en minutos
  status: 'checked-in' | 'checked-out' | 'active';
  notes?: string;
}

export interface AttendanceStats {
  totalVisits: number;
  thisMonthVisits: number;
  thisWeekVisits: number;
  averageWeeklyVisits: number;
  lastVisit: Date | null;
  longestStreak: number;
  currentStreak: number;
}

export const attendanceService = {
  // Registrar check-in
  checkIn: async (memberId: string, gymId: string, memberName: string): Promise<AttendanceRecord> => {
    try {
      console.log('📍 Registrando check-in...');
      
      const now = new Date();
      const currentTime = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Verificar si ya hay un check-in activo hoy
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const todayQuery = query(
        attendanceRef,
        where('memberId', '==', memberId),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<', Timestamp.fromDate(todayEnd)),
        where('status', '==', 'checked-in')
      );

      const todaySnapshot = await getDocs(todayQuery);
      
      if (!todaySnapshot.empty) {
        throw new Error('Ya tienes un check-in activo para hoy');
      }

      // Crear nuevo registro de asistencia
      const attendanceData: Omit<AttendanceRecord, 'id'> = {
        memberId,
        gymId,
        memberName,
        date: Timestamp.fromDate(now),
        checkInTime: currentTime,
        status: 'checked-in',
        notes: `Check-in automático desde app móvil`
      };

      const docRef = await addDoc(attendanceRef, attendanceData);
      
      console.log('✅ Check-in registrado exitosamente');
      
      return {
        id: docRef.id,
        ...attendanceData
      };

    } catch (error) {
      console.error('❌ Error en check-in:', error);
      throw error;
    }
  },

  // Registrar check-out
  checkOut: async (memberId: string, gymId: string): Promise<AttendanceRecord> => {
    try {
      console.log('📍 Registrando check-out...');
      
      const now = new Date();
      const currentTime = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Buscar check-in activo de hoy
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const todayQuery = query(
        attendanceRef,
        where('memberId', '==', memberId),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<', Timestamp.fromDate(todayEnd)),
        where('status', '==', 'checked-in')
      );

      const todaySnapshot = await getDocs(todayQuery);
      
      if (todaySnapshot.empty) {
        throw new Error('No hay un check-in activo para hacer check-out');
      }

      const attendanceDoc = todaySnapshot.docs[0];
      const attendanceData = attendanceDoc.data() as AttendanceRecord;

      // Calcular duración
      const checkInTime = attendanceData.checkInTime || '00:00';
      const duration = calculateDuration(checkInTime, currentTime);

      // Actualizar registro
      const attendanceDocRef = doc(db, 'gyms', gymId, 'attendances', attendanceDoc.id);
      await updateDoc(attendanceDocRef, {
        checkOutTime: currentTime,
        duration: duration,
        status: 'checked-out'
      });

      console.log('✅ Check-out registrado exitosamente');
      
      return {
        ...attendanceData,
        id: attendanceDoc.id,
        checkOutTime: currentTime,
        duration: duration,
        status: 'checked-out'
      };

    } catch (error) {
      console.error('❌ Error en check-out:', error);
      throw error;
    }
  },

  // Obtener asistencias recientes
  getRecentAttendances: async (memberId: string, gymId: string, limitCount: number = 10): Promise<AttendanceRecord[]> => {
    try {
      console.log('📋 Obteniendo asistencias recientes...');
      
      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const q = query(
        attendanceRef,
        where('memberId', '==', memberId),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const attendances: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendances.push({
          id: doc.id,
          ...data
        } as AttendanceRecord);
      });

      console.log(`✅ ${attendances.length} asistencias obtenidas`);
      return attendances;

    } catch (error) {
      console.error('❌ Error obteniendo asistencias:', error);
      return [];
    }
  },

  // Verificar estado actual del miembro
  getCurrentStatus: async (memberId: string, gymId: string): Promise<{
    isCheckedIn: boolean;
    lastCheckIn?: AttendanceRecord;
    canCheckOut: boolean;
  }> => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const todayQuery = query(
        attendanceRef,
        where('memberId', '==', memberId),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<', Timestamp.fromDate(todayEnd)),
        orderBy('date', 'desc'),
        limit(1)
      );

      const todaySnapshot = await getDocs(todayQuery);
      
      if (todaySnapshot.empty) {
        return {
          isCheckedIn: false,
          canCheckOut: false
        };
      }

      const lastRecord = todaySnapshot.docs[0].data() as AttendanceRecord;
      
      return {
        isCheckedIn: lastRecord.status === 'checked-in',
        lastCheckIn: {
          ...lastRecord,
          id: todaySnapshot.docs[0].id
        },
        canCheckOut: lastRecord.status === 'checked-in'
      };

    } catch (error) {
      console.error('❌ Error verificando estado:', error);
      return {
        isCheckedIn: false,
        canCheckOut: false
      };
    }
  },

  // Obtener estadísticas de asistencia
  getAttendanceStats: async (memberId: string, gymId: string): Promise<AttendanceStats> => {
    try {
      console.log('📊 Calculando estadísticas de asistencia...');
      
      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const q = query(
        attendanceRef,
        where('memberId', '==', memberId),
        orderBy('date', 'desc'),
        limit(100) // Últimas 100 asistencias para cálculos
      );

      const querySnapshot = await getDocs(q);
      const attendances: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendances.push({
          id: doc.id,
          ...data
        } as AttendanceRecord);
      });

      // Calcular estadísticas
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeekStart = getStartOfWeek(now);

      const thisMonthVisits = attendances.filter(att => 
        att.date.toDate() >= thisMonthStart
      ).length;

      const thisWeekVisits = attendances.filter(att => 
        att.date.toDate() >= thisWeekStart
      ).length;

      const lastVisit = attendances.length > 0 ? attendances[0].date.toDate() : null;

      // Calcular racha actual
      const currentStreak = calculateCurrentStreak(attendances);
      const longestStreak = calculateLongestStreak(attendances);

      // Promedio semanal (últimas 4 semanas)
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      const recentVisits = attendances.filter(att => 
        att.date.toDate() >= fourWeeksAgo
      ).length;
      const averageWeeklyVisits = Math.round(recentVisits / 4);

      const stats: AttendanceStats = {
        totalVisits: attendances.length,
        thisMonthVisits,
        thisWeekVisits,
        averageWeeklyVisits,
        lastVisit,
        longestStreak,
        currentStreak
      };

      console.log('✅ Estadísticas calculadas:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error calculando estadísticas:', error);
      return {
        totalVisits: 0,
        thisMonthVisits: 0,
        thisWeekVisits: 0,
        averageWeeklyVisits: 0,
        lastVisit: null,
        longestStreak: 0,
        currentStreak: 0
      };
    }
  },

  // Obtener asistencias por rango de fechas
  getAttendancesByDateRange: async (
    memberId: string, 
    gymId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AttendanceRecord[]> => {
    try {
      const attendanceRef = collection(db, 'gyms', gymId, 'attendances');
      const q = query(
        attendanceRef,
        where('memberId', '==', memberId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const attendances: AttendanceRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendances.push({
          id: doc.id,
          ...data
        } as AttendanceRecord);
      });

      return attendances;

    } catch (error) {
      console.error('❌ Error obteniendo asistencias por rango:', error);
      return [];
    }
  }
};

// Funciones auxiliares
function calculateDuration(checkInTime: string, checkOutTime: string): number {
  try {
    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
    
    const checkInMinutes = checkInHour * 60 + checkInMinute;
    const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
    
    let duration = checkOutMinutes - checkInMinutes;
    
    // Si el check-out es al día siguiente
    if (duration < 0) {
      duration += 24 * 60;
    }
    
    return duration;
  } catch {
    return 0;
  }
}

function getStartOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
  return new Date(date.setDate(diff));
}

function calculateCurrentStreak(attendances: AttendanceRecord[]): number {
  if (attendances.length === 0) return 0;
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < attendances.length; i++) {
    const attendanceDate = attendances[i].date.toDate();
    attendanceDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today.getTime() - attendanceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
    } else if (daysDiff > streak) {
      break;
    }
  }
  
  return streak;
}

function calculateLongestStreak(attendances: AttendanceRecord[]): number {
  if (attendances.length === 0) return 0;
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  // Ordenar por fecha ascendente para calcular rachas
  const sortedAttendances = [...attendances].sort((a, b) => 
    a.date.toDate().getTime() - b.date.toDate().getTime()
  );
  
  for (let i = 1; i < sortedAttendances.length; i++) {
    const prevDate = sortedAttendances[i - 1].date.toDate();
    const currDate = sortedAttendances[i].date.toDate();
    
    prevDate.setHours(0, 0, 0, 0);
    currDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return longestStreak;
}