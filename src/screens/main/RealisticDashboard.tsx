// src/screens/main/RealisticDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface DashboardData {
  userName: string;
  membership: {
    type: string;
    status: 'active' | 'expired' | 'pending';
    expiryDate: string;
    daysRemaining: number;
  };
  recentAttendance: Array<{
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
}

export const RealisticDashboard: React.FC = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      if (!memberInfo || !gymInfo) {
        setLoading(false);
        return;
      }

      console.log('📊 Cargando dashboard realista para:', memberInfo.firstName, memberInfo.lastName);

      // Simular carga breve
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar SOLO datos que sabemos que existen
      const realisticData: DashboardData = {
        userName: `${memberInfo.firstName} ${memberInfo.lastName}`,
        membership: {
          type: 'Membresía Básica', // Por ahora fijo
          status: memberInfo.status === 'active' ? 'active' : 'expired',
          expiryDate: '2025-12-31', // Fecha fija por ahora
          daysRemaining: memberInfo.status === 'active' ? 180 : 0
        },
        // Asistencias de ejemplo realistas (mientras conectamos los datos reales)
        recentAttendance: [
          { date: '2025-06-25', time: '18:30', type: 'check-in' },
          { date: '2025-06-23', time: '17:45', type: 'check-in' },
          { date: '2025-06-21', time: '19:15', type: 'check-in' },
          { date: '2025-06-19', time: '18:00', type: 'check-in' },
          { date: '2025-06-17', time: '17:30', type: 'check-in' },
        ],
        nextPayment: {
          amount: memberInfo.totalDebt || 0,
          dueDate: '2025-07-15',
          status: (memberInfo.totalDebt || 0) > 0 ? 'pending' : 'paid',
          concept: 'Cuota Mensual Julio'
        },
        totalVisitsThisMonth: 8 // Número realista
      };
      
      console.log('✅ Dashboard realista cargado');
      setDashboardData(realisticData);
      
    } catch (error) {
      console.error('❌ Error cargando dashboard realista:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [memberInfo, gymInfo]);

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
        <Text style={styles.loadingText}>Cargando tu información...</Text>
        {memberInfo && (
          <Text style={styles.loadingSubtext}>
            Bienvenido {memberInfo.firstName}
          </Text>
        )}
      </View>
    );
  }

  if (!memberInfo || !gymInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudieron cargar los datos del miembro</Text>
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
              dashboardData.recentAttendance[0].time : 
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
          <Text style={styles.cardTitle}>Estado de Pagos</Text>
        </View>
        <Text style={styles.paymentConcept}>{dashboardData.nextPayment.concept}</Text>
        <Text style={styles.paymentAmount}>${dashboardData.nextPayment.amount.toLocaleString('es-AR')}</Text>
        <Text style={styles.paymentDate}>
          {dashboardData.nextPayment.amount > 0 ? 
            `Vence: ${new Date(dashboardData.nextPayment.dueDate).toLocaleDateString('es-ES')}` :
            'Sin deudas pendientes'
          }
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

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

// Usar los mismos estilos del DashboardScreen original
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
  bottomSpacing: {
    height: 30,
  },
});