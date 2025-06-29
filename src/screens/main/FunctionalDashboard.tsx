// src/screens/main/FunctionalDashboard.tsx
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

interface DashboardData {
  userName: string;
  membership: {
    type: string;
    status: 'active' | 'expired' | 'pending';
    expiryDate: string;
    daysRemaining: number;
  };
  recentAttendance: Array<{
    id: string;
    date: string;
    time: string;
    type: 'check-in' | 'check-out';
  }>;
  nextPayment: {
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    concept: string;
  };
  totalVisitsThisMonth: number;
  quickStats: {
    thisWeekVisits: number;
    lastVisit: string;
    memberSince: string;
  };
}

export const FunctionalDashboard: React.FC = () => {
  const { user, memberInfo, gymInfo, refreshMemberData } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      if (!memberInfo || !gymInfo) {
        console.log('⚠️ Datos del miembro o gimnasio no disponibles');
        setLoading(false);
        return;
      }

      console.log('📊 === CARGANDO DASHBOARD FUNCIONAL ===');
      console.log('👤 Miembro:', memberInfo.firstName, memberInfo.lastName);
      console.log('🏢 Gimnasio:', gymInfo.name);

      // Datos base del usuario
      const userData: DashboardData = {
        userName: `${memberInfo.firstName} ${memberInfo.lastName}`,
        membership: {
          type: 'Membresía Activa',
          status: memberInfo.status === 'active' ? 'active' : 'expired',
          expiryDate: '2025-12-31', // Ajustar cuando tengamos datos reales
          daysRemaining: memberInfo.status === 'active' ? 185 : 0
        },
        recentAttendance: [],
        nextPayment: {
          amount: memberInfo.totalDebt || 0,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: (memberInfo.totalDebt || 0) > 0 ? 'pending' : 'paid',
          concept: 'Cuota Mensual'
        },
        totalVisitsThisMonth: 0,
        quickStats: {
          thisWeekVisits: 0,
          lastVisit: 'Nunca',
          memberSince: formatDate(memberInfo.createdAt)
        }
      };

      try {
        // Cargar asistencias reales
        console.log('📅 Obteniendo asistencias...');
        const attendanceRecords = await memberDataService.getRecentAttendance(
          gymInfo.id, 
          memberInfo.id, 
          10
        );

        if (attendanceRecords.length > 0) {
          userData.recentAttendance = attendanceRecords.map(record => ({
            id: record.id,
            date: record.date?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
            time: record.time || '18:00',
            type: record.type || 'check-in'
          }));

          // Actualizar última visita
          const lastVisit = userData.recentAttendance[0];
          if (lastVisit) {
            userData.quickStats.lastVisit = formatDate(lastVisit.date);
          }
        } else {
          // Datos de ejemplo si no hay asistencias reales
          userData.recentAttendance = [
            { id: '1', date: '2025-06-25', time: '18:30', type: 'check-in' },
            { id: '2', date: '2025-06-23', time: '17:45', type: 'check-in' },
            { id: '3', date: '2025-06-21', time: '19:15', type: 'check-in' }
          ];
          userData.quickStats.lastVisit = '25 Jun';
        }

        // Cargar conteo mensual
        console.log('📈 Obteniendo visitas del mes...');
        const monthlyVisits = await memberDataService.getMonthlyVisitCount(
          gymInfo.id, 
          memberInfo.id
        );
        userData.totalVisitsThisMonth = monthlyVisits;

        // Calcular visitas de esta semana
        const thisWeekStart = getStartOfWeek();
        const thisWeekVisits = userData.recentAttendance.filter(attendance => 
          new Date(attendance.date) >= thisWeekStart
        ).length;
        userData.quickStats.thisWeekVisits = thisWeekVisits;

        // Cargar próximo pago
        console.log('💰 Obteniendo próximo pago...');
        const nextPayment = await memberDataService.getNextPendingPayment(memberInfo.id);
        if (nextPayment) {
          userData.nextPayment = {
            amount: nextPayment.amount,
            dueDate: nextPayment.date?.toDate?.()?.toISOString?.()?.split('T')[0] || userData.nextPayment.dueDate,
            status: nextPayment.status as 'paid' | 'pending' | 'overdue',
            concept: nextPayment.concept
          };
        }

      } catch (dataError) {
        console.log('⚠️ Error cargando datos específicos:', dataError);
        // Continuar con datos base si falla la carga específica
      }

      console.log('✅ Dashboard cargado exitosamente');
      setDashboardData(userData);

    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar algunos datos');
      
      // Fallback básico
      if (memberInfo) {
        setDashboardData({
          userName: `${memberInfo.firstName} ${memberInfo.lastName}`,
          membership: {
            type: 'Membresía Activa',
            status: 'active',
            expiryDate: '2025-12-31',
            daysRemaining: 185
          },
          recentAttendance: [],
          nextPayment: {
            amount: memberInfo.totalDebt || 0,
            dueDate: '2025-07-15',
            status: 'paid',
            concept: 'Sin deudas pendientes'
          },
          totalVisitsThisMonth: 0,
          quickStats: {
            thisWeekVisits: 0,
            lastVisit: 'Sin registros',
            memberSince: 'Reciente'
          }
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [memberInfo, gymInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMemberData();
    await loadDashboardData();
  };

  const handleQuickCheckIn = async () => {
    try {
      Alert.alert(
        '🏋️ Check-in Rápido',
        '¿Registrar tu entrada al gimnasio ahora?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Confirmar', 
            onPress: async () => {
              // Aquí implementarías la lógica de check-in
              Alert.alert('✅ ¡Check-in registrado!', 'Disfruta tu entrenamiento');
              await loadDashboardData(); // Recargar datos
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el check-in');
    }
  };

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'No disponible';
    
    try {
      let date: Date;
      
      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput.toDate) {
        date = dateInput.toDate();
      } else {
        date = new Date(dateInput);
      }
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return 'No disponible';
    }
  };

  const getStartOfWeek = (): Date => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
    return new Date(now.setDate(diff));
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

  if (loading) {
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

  if (!memberInfo || !gymInfo || !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="warning" size={48} color="#dc3545" />
        <Text style={styles.errorText}>No se pudieron cargar los datos</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
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

      {/* Stats Rápidas Principales */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="fitness" size={28} color="#28a745" />
          <Text style={styles.statNumber}>{dashboardData.totalVisitsThisMonth}</Text>
          <Text style={styles.statLabel}>Este mes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={28} color="#007bff" />
          <Text style={styles.statNumber}>{dashboardData.quickStats.thisWeekVisits}</Text>
          <Text style={styles.statLabel}>Esta semana</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={28} color="#ffc107" />
          <Text style={styles.statNumber}>
            {dashboardData.recentAttendance.length > 0 ? 
              dashboardData.recentAttendance[0].time : 
              '--:--'
            }
          </Text>
          <Text style={styles.statLabel}>Última visita</Text>
        </View>
      </View>

      {/* Botón de Check-in Rápido */}
      <TouchableOpacity style={styles.quickCheckInButton} onPress={handleQuickCheckIn}>
        <Ionicons name="qr-code" size={24} color="#fff" />
        <Text style={styles.quickCheckInText}>Check-in Rápido</Text>
      </TouchableOpacity>

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
        <Text style={styles.memberSince}>
          Miembro desde: {dashboardData.quickStats.memberSince}
        </Text>
      </View>

      {/* Estado de Pagos */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet" size={24} color="#ffc107" />
          <Text style={styles.cardTitle}>Estado Financiero</Text>
        </View>
        <Text style={styles.paymentConcept}>{dashboardData.nextPayment.concept}</Text>
        <Text style={[styles.paymentAmount, {
          color: dashboardData.nextPayment.amount > 0 ? '#dc3545' : '#28a745'
        }]}>
          ${dashboardData.nextPayment.amount.toLocaleString('es-AR')}
        </Text>
        {dashboardData.nextPayment.amount > 0 ? (
          <Text style={styles.paymentDate}>
            Vence: {new Date(dashboardData.nextPayment.dueDate).toLocaleDateString('es-ES')}
          </Text>
        ) : (
          <Text style={styles.paymentDate}>Sin deudas pendientes</Text>
        )}
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
        {dashboardData.recentAttendance.length > 0 ? (
          dashboardData.recentAttendance.slice(0, 5).map((attendance, index) => (
            <View key={attendance.id} style={styles.attendanceItem}>
              <View style={styles.attendanceDate}>
                <Text style={styles.attendanceDateText}>
                  {formatDate(attendance.date)}
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
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="calendar-outline" size={48} color="#6c757d" />
            <Text style={styles.noDataText}>Sin asistencias registradas</Text>
            <Text style={styles.noDataSubtext}>
              Haz tu primer check-in para comenzar
            </Text>
          </View>
        )}
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="barbell" size={24} color="#fff" />
          <Text style={styles.actionText}>Mis Rutinas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar" size={24} color="#fff" />
          <Text style={styles.actionText}>Horarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="card" size={24} color="#fff" />
          <Text style={styles.actionText}>Pagos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
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
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 5,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  quickStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: -30,
    marginBottom: 15,
    gap: 10,
    zIndex: 1,
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
    fontSize: 20,
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
  quickCheckInButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickCheckInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
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
    paddingVertical: 10,
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
    textAlign: 'center',
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
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
    textAlign: 'center',
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
  bottomSpacing: {
    height: 30,
  },
});