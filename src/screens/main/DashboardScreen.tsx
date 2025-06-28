// src/screens/main/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { memberDataService } from '../../services/firebase/memberDataService';
import { debugDataService } from '../../services/firebase/debugDataService';

// Tipos de datos
interface MembershipInfo {
  type: string;
  status: 'active' | 'expired' | 'pending';
  expiryDate: string;
  daysRemaining: number;
}

interface AttendanceRecord {
  date: string;
  time: string;
  type: 'check-in' | 'check-out';
}

interface PaymentInfo {
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  concept: string;
}

interface DashboardData {
  userName: string;
  membership: MembershipInfo;
  recentAttendance: AttendanceRecord[];
  nextPayment: PaymentInfo;
  totalVisitsThisMonth: number;
}

export const DashboardScreen: React.FC = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar datos
  const loadDashboardData = async () => {
    try {
      if (!memberInfo || !gymInfo) {
        console.log('⚠️ memberInfo o gymInfo no disponible');
        setLoading(false);
        return;
      }

      console.log('📊 Cargando datos del dashboard para:', memberInfo.firstName, memberInfo.lastName);
      console.log('🏢 Gimnasio ID:', gymInfo.id);
      console.log('👤 Member ID:', memberInfo.id);

      // 🔍 HACER DEBUG COMPLETO PRIMERO
      await debugDataService.checkMemberCollections(gymInfo.id, memberInfo.id);
      await debugDataService.checkMainCollections();

      // Usar timeout para evitar carga infinita
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout cargando datos')), 10000); // 10 segundos
      });

      try {
        console.log('⏳ Intentando cargar datos de Firebase...');
        
        // Probar solo una consulta primero para debug
        console.log('📊 Cargando visitas del mes...');
        const monthlyVisitsResult = await Promise.race([
          memberDataService.getMonthlyVisitCount(gymInfo.id, memberInfo.id),
          timeoutPromise
        ]);
        const monthlyVisits = typeof monthlyVisitsResult === 'number' ? monthlyVisitsResult : 0;
        console.log('✅ Visitas del mes obtenidas:', monthlyVisits);

        // Si llegamos aquí, Firebase funciona, cargar el resto
        console.log('📊 Cargando resto de datos...');
        const results = await Promise.race([
          Promise.all([
            memberDataService.getRecentAttendance(gymInfo.id, memberInfo.id, 5),
            memberDataService.getNextPendingPayment(memberInfo.id),
            memberDataService.getMembershipDetails(gymInfo.id, memberInfo.id)
          ]),
          timeoutPromise
        ]);
        
        const [attendanceRecords, nextPayment, membershipDetails] = results as [any[], any, any];
        
        console.log('✅ Todos los datos cargados exitosamente');
        
        // Convertir asistencias de Firebase a formato del dashboard
        const recentAttendance = (attendanceRecords || []).map((record: any) => ({
          date: record.date?.toDate?.()?.toISOString?.()?.split('T')[0] || '2025-06-01',
          time: record.time || '00:00',
          type: record.type || 'check-in'
        }));

        // Usar datos reales del miembro y gimnasio
        const realData: DashboardData = {
          userName: `${memberInfo.firstName} ${memberInfo.lastName}`,
          membership: {
            type: membershipDetails?.plan || 'Membresía Activa',
            status: memberInfo.status === 'active' ? 'active' : 'expired',
            expiryDate: membershipDetails?.endDate?.toDate?.()?.toISOString?.()?.split('T')[0] || '2025-12-31',
            daysRemaining: membershipDetails?.endDate ? 
              Math.max(0, Math.ceil((membershipDetails.endDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 
              0
          },
          recentAttendance: recentAttendance,
          nextPayment: nextPayment ? {
            amount: nextPayment.amount || 0,
            dueDate: nextPayment.date?.toDate?.()?.toISOString?.()?.split('T')[0] || '2025-07-01',
            status: (nextPayment.status as 'paid' | 'pending' | 'overdue') || 'pending',
            concept: nextPayment.concept || 'Cuota Mensual'
          } : {
            amount: memberInfo.totalDebt || 0,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: (memberInfo.totalDebt || 0) > 0 ? 'pending' : 'paid',
            concept: 'Cuota Mensual'
          },
          totalVisitsThisMonth: monthlyVisits
        };
        
        console.log('✅ Datos del dashboard preparados:', realData);
        setDashboardData(realData);
        
      } catch (firebaseError) {
        console.log('⚠️ Error o timeout en consultas Firebase, usando datos básicos');
        console.log('🔍 Error detalle:', firebaseError);
        
        // Usar datos básicos si Firebase falla
        throw firebaseError;
      }

    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      
      // Verificar que memberInfo aún existe para el fallback
      if (!memberInfo) {
        console.log('❌ memberInfo perdido durante carga');
        setLoading(false);
        return;
      }
      
      console.log('🔄 Usando datos de fallback...');
      
      // Fallback con datos básicos si falla la carga
      const fallbackData: DashboardData = {
        userName: `${memberInfo.firstName} ${memberInfo.lastName}`,
        membership: {
          type: 'Membresía Activa',
          status: memberInfo.status === 'active' ? 'active' : 'expired',
          expiryDate: '2025-12-31',
          daysRemaining: memberInfo.status === 'active' ? 30 : 0
        },
        recentAttendance: [
          // Datos de ejemplo para mostrar la interfaz
          { date: '2025-06-24', time: '18:30', type: 'check-in' },
          { date: '2025-06-22', time: '17:45', type: 'check-in' },
        ],
        nextPayment: {
          amount: memberInfo.totalDebt || 0,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: (memberInfo.totalDebt || 0) > 0 ? 'pending' : 'paid',
          concept: 'Cuota Mensual'
        },
        totalVisitsThisMonth: 0
      };
      
      console.log('✅ Datos de fallback aplicados:', fallbackData);
      setDashboardData(fallbackData);
      
    } finally {
      console.log('🏁 Finalizando carga del dashboard');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'pending': return '#ffc107';
      case 'expired':
      case 'overdue': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'pending': return 'Pendiente';
      case 'expired': return 'Vencida';
      case 'overdue': return 'Vencido';
      default: return status;
    }
  };

  if (loading || !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando tu información...</Text>
        {memberInfo && (
          <Text style={styles.loadingSubtext}>
            Bienvenido {memberInfo.firstName}
          </Text>
        )}
      </View>
    );
  }

  // Si no hay datos del miembro, mostrar mensaje
  if (!memberInfo || !gymInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          No se pudieron cargar los datos del miembro
        </Text>
        <Text style={styles.errorSubtext}>
          Tu cuenta podría no estar vinculada correctamente
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header de Bienvenida */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>¡Hola, {dashboardData.userName}!</Text>
        <Text style={styles.gymText}>📍 {gymInfo.name}</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {/* Card de Membresía */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="card" size={24} color="#007bff" />
          <Text style={styles.cardTitle}>Mi Membresía</Text>
        </View>
        <View style={styles.membershipInfo}>
          <Text style={styles.membershipType}>{dashboardData.membership.type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dashboardData.membership.status) }]}>
            <Text style={styles.statusText}>{getStatusText(dashboardData.membership.status)}</Text>
          </View>
        </View>
        <Text style={styles.expiryText}>
          Vence: {new Date(dashboardData.membership.expiryDate).toLocaleDateString('es-ES')}
        </Text>
        <Text style={styles.daysRemaining}>
          {dashboardData.membership.daysRemaining} días restantes
        </Text>
      </View>

      {/* Stats Rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="fitness" size={32} color="#28a745" />
          <Text style={styles.statNumber}>{dashboardData.totalVisitsThisMonth}</Text>
          <Text style={styles.statLabel}>Visitas este mes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={32} color="#007bff" />
          <Text style={styles.statNumber}>
            {dashboardData.recentAttendance.length > 0 ? 
              new Date(`2000-01-01T${dashboardData.recentAttendance[0].time}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 
              '--:--'
            }
          </Text>
          <Text style={styles.statLabel}>Última visita</Text>
        </View>
      </View>

      {/* Próximo Pago */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet" size={24} color="#ffc107" />
          <Text style={styles.cardTitle}>Próximo Pago</Text>
        </View>
        <Text style={styles.paymentConcept}>{dashboardData.nextPayment.concept}</Text>
        <Text style={styles.paymentAmount}>${dashboardData.nextPayment.amount}</Text>
        <Text style={styles.paymentDate}>
          Vence: {new Date(dashboardData.nextPayment.dueDate).toLocaleDateString('es-ES')}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dashboardData.nextPayment.status) }]}>
          <Text style={styles.statusText}>{getStatusText(dashboardData.nextPayment.status)}</Text>
        </View>
      </View>

      {/* Asistencias Recientes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={24} color="#28a745" />
          <Text style={styles.cardTitle}>Asistencias Recientes</Text>
        </View>
        {dashboardData.recentAttendance.map((attendance, index) => (
          <View key={index} style={styles.attendanceItem}>
            <View style={styles.attendanceDate}>
              <Text style={styles.attendanceDateText}>
                {new Date(attendance.date).toLocaleDateString('es-ES', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.attendanceDetails}>
              <Text style={styles.attendanceTime}>{attendance.time}</Text>
              <Text style={styles.attendanceType}>
                {attendance.type === 'check-in' ? 'Entrada' : 'Salida'}
              </Text>
            </View>
            <Ionicons 
              name={attendance.type === 'check-in' ? 'enter' : 'exit'} 
              size={20} 
              color="#007bff" 
            />
          </View>
        ))}
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="qr-code" size={24} color="#fff" />
          <Text style={styles.actionText}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="barbell" size={24} color="#fff" />
          <Text style={styles.actionText}>Rutinas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar" size={24} color="#fff" />
          <Text style={styles.actionText}>Clases</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 5,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#007bff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  gymText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#212529',
  },
  membershipInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membershipType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expiryText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  daysRemaining: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  paymentConcept: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  attendanceDate: {
    width: 60,
    alignItems: 'center',
  },
  attendanceDateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007bff',
    textTransform: 'uppercase',
  },
  attendanceDetails: {
    flex: 1,
    marginLeft: 15,
  },
  attendanceTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  attendanceType: {
    fontSize: 14,
    color: '#6c757d',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 8,
    gap: 10,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
});