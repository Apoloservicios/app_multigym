// src/screens/main/RealisticDashboard.tsx - CONECTADO AL BACKEND REAL
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService } from '../../services/firebase/multiMembershipService';

// 🆕 IMPORTAR LOS NUEVOS COMPONENTES
import { EnhancedCheckinButton } from '../../components/checkin/EnhancedCheckinButton';
import { QuickActionsGrid } from '../../components/checkin/QuickActionsGrid';


import { RealDataTester } from '../../components/debug/RealDataTester';

// Interfaces para los datos reales
interface MembershipInfo {
  id: string;
  memberId: string;
  gymId: string;
  gymName: string;
  planType: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: any;
  endDate: any;
  monthlyFee: number;
  totalDebt: number;
}

interface AttendanceRecord {
  id: string;
  membershipId: string;
  date: any;
  time: string;
  type: 'check-in' | 'check-out';
}

interface PaymentInfo {
  id: string;
  membershipId: string;
  amount: number;
  date: any;
  concept: string;
  status: 'paid' | 'pending' | 'overdue';
}

export const RealisticDashboard: React.FC = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  const [memberships, setMemberships] = useState<MembershipInfo[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [thisMonthVisits, setThisMonthVisits] = useState(0);

  // Función para cargar datos reales
  const loadDashboardData = async (showRefresh = false) => {
    try {
      if (!memberInfo) {
        console.log('⚠️ memberInfo no disponible');
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      console.log('📊 Cargando datos reales del dashboard para:', memberInfo.id);

      // 1. Cargar membresías reales
      const membershipData = await multiMembershipService.getUserMemberships(memberInfo.id);
      console.log('✅ Membresías cargadas:', membershipData.length);
      setMemberships(membershipData);

      // 2. Cargar asistencias recientes (solo para la primera membresía activa)
      if (membershipData.length > 0) {
        const activeMembership = membershipData.find(m => m.status === 'active') || membershipData[0];
        
        const attendanceData = await multiMembershipService.getMembershipAttendance(activeMembership.id, 10);
        console.log('✅ Asistencias cargadas:', attendanceData.length);
        setRecentAttendances(attendanceData);

        // 3. Calcular visitas del mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthAttendances = attendanceData.filter(att => {
          const attDate = att.date.toDate();
          return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentYear;
        });
        setThisMonthVisits(thisMonthAttendances.length);

        // 4. Cargar pagos pendientes
        const paymentData = await multiMembershipService.getMembershipPayments(activeMembership.id, 5);
        console.log('✅ Pagos cargados:', paymentData.length);
        setPayments(paymentData);
      }

    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (memberInfo) {
      loadDashboardData();
    }
  }, [memberInfo]);

  // Función para formatear fechas
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Sin fecha';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Función para calcular días restantes
  const getDaysRemaining = (endDate: any) => {
    if (!endDate) return 0;
    
    try {
      const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch (error) {
      return 0;
    }
  };

  // Función para quick check-in - YA NO ES NECESARIA, MANEJADA POR EL COMPONENTE
  // const handleQuickCheckin = async () => { ... }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Cargando tu información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
  const nextPayment = payments.find(p => p.status === 'pending') || payments[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={['#007bff']}
          />
        }
      >
        {/* Header con saludo personalizado */}
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>
              ¡Hola, {memberInfo?.firstName || 'Usuario'}!
            </Text>
            <Text style={styles.gymName}>
              📍 {gymInfo?.name || 'Tu Gimnasio'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>

        {/* Cards de estadísticas principales */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={24} color="#28a745" />
            <Text style={styles.statNumber}>{thisMonthVisits}</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#007bff" />
            <Text style={styles.statNumber}>{recentAttendances.length}</Text>
            <Text style={styles.statLabel}>Esta semana</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#ffc107" />
            <Text style={styles.statNumber}>
              {recentAttendances.length > 0 ? recentAttendances[0].time : '00:00'}
            </Text>
            <Text style={styles.statLabel}>Última visita</Text>
          </View>
        </View>

        {/* Botón de Check-in Rápido - REEMPLAZADO POR COMPONENTE MEJORADO */}
        <EnhancedCheckinButton 
          onCheckinSuccess={() => loadDashboardData(true)}
          onCheckinError={(error) => console.error('Check-in error:', error)}
        />

        {/* Información de Membresía */}
        {activeMembership && (
          <View style={styles.membershipCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="card-outline" size={24} color="#007bff" />
              <Text style={styles.cardTitle}>Mi Membresía</Text>
            </View>
            
            <View style={styles.membershipInfo}>
              <View style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>{activeMembership.planType}</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: activeMembership.status === 'active' ? '#28a745' : '#dc3545' }
                ]}>
                  <Text style={styles.statusText}>
                    {activeMembership.status === 'active' ? 'Activa' : 'Vencida'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.membershipDetails}>
                <Text style={styles.membershipExpiry}>
                  Vence: {formatDate(activeMembership.endDate)}
                </Text>
                <Text style={styles.daysRemaining}>
                  {getDaysRemaining(activeMembership.endDate)} días restantes
                </Text>
                <Text style={styles.membershipSince}>
                  Miembro desde: {formatDate(activeMembership.startDate)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Estado Financiero */}
        {nextPayment && (
          <View style={styles.financialCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet-outline" size={24} color="#ffc107" />
              <Text style={styles.cardTitle}>Estado Financiero</Text>
            </View>
            
            <View style={styles.financialInfo}>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Cuota Mensual</Text>
                <Text style={styles.financialAmount}>
                  ${activeMembership?.monthlyFee?.toLocaleString() || '0'}
                </Text>
              </View>
              
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Vence</Text>
                <Text style={styles.financialDate}>
                  {formatDate(nextPayment.date)}
                </Text>
              </View>
              
              {activeMembership?.totalDebt > 0 && (
                <View style={[styles.financialRow, styles.debtRow]}>
                  <Text style={styles.debtLabel}>Deuda pendiente</Text>
                  <Text style={styles.debtAmount}>
                    ${activeMembership.totalDebt.toLocaleString()}
                  </Text>
                </View>
              )}
              
              <View style={styles.paymentStatus}>
                <View style={[
                  styles.paymentBadge,
                  { backgroundColor: nextPayment.status === 'paid' ? '#28a745' : '#ffc107' }
                ]}>
                  <Text style={styles.paymentText}>
                    {nextPayment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Asistencias Recientes */}
        <View style={styles.attendanceCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={24} color="#6f42c1" />
            <Text style={styles.cardTitle}>Asistencias Recientes</Text>
          </View>
          
          {recentAttendances.length > 0 ? (
            <View style={styles.attendanceList}>
              {recentAttendances.slice(0, 5).map((attendance, index) => (
                <View key={attendance.id || index} style={styles.attendanceItem}>
                  <View style={styles.attendanceLeft}>
                    <Text style={styles.attendanceDate}>
                      {formatDate(attendance.date)}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {attendance.time}
                    </Text>
                  </View>
                  
                  <View style={styles.attendanceRight}>
                    <Text style={styles.attendanceType}>
                      {attendance.type === 'check-in' ? 'Entrada' : 'Salida'}
                    </Text>
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color="#28a745" 
                    />
                  </View>
                </View>
              ))}
              
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>Ver todas las asistencias</Text>
                <Ionicons name="chevron-forward" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#6c757d" />
              <Text style={styles.emptyText}>Sin asistencias registradas</Text>
              <Text style={styles.emptySubtext}>
                Tu primera visita aparecerá aquí
              </Text>
            </View>
          )}
        </View>

        {/* Accesos rápidos - NUEVO COMPONENTE */}
        <QuickActionsGrid 
          onNavigateToRoutines={() => Alert.alert('Rutinas', 'Navegar a la pestaña Rutinas')}
          onNavigateToAttendance={() => Alert.alert('Asistencias', 'Navegar a la pestaña Asistencias')}
          onNavigateToPayments={() => Alert.alert('Pagos', 'Funcionalidad de pagos próximamente')}
          onOpenSupport={() => Alert.alert('Soporte', 'Contacta al gimnasio para ayuda')}
        />

        {/* Espacio inferior para el tab navigator */}
        <View style={styles.bottomSpace} />
      </ScrollView>
      
            {/* TEMPORAL - SOLO PARA TESTING */}
      <RealDataTester />
    </SafeAreaView>
    
  );
};

// 🎨 ESTILOS COMPLETOS
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#007bff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#007bff',
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  gymName: {
    fontSize: 16,
    color: '#cce7ff',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#007bff',
    paddingBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#cce7ff',
    textAlign: 'center',
  },
  
  // Check-in button - YA NO NECESARIO, MANEJADO POR COMPONENTE
  /*
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    marginHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  checkinText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  */
  
  // Card styles
  membershipCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financialCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
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
    color: '#212529',
    marginLeft: 10,
  },
  
  // Membership styles
  membershipInfo: {
    marginTop: 10,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membershipLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  membershipDetails: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  membershipExpiry: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 5,
  },
  daysRemaining: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginBottom: 10,
  },
  membershipSince: {
    fontSize: 14,
    color: '#6c757d',
  },
  
  // Financial styles
  financialInfo: {
    marginTop: 10,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  financialLabel: {
    fontSize: 16,
    color: '#212529',
  },
  financialAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  financialDate: {
    fontSize: 16,
    color: '#6c757d',
  },
  debtRow: {
    backgroundColor: '#fff3cd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  debtLabel: {
    fontSize: 16,
    color: '#856404',
    fontWeight: '600',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  paymentStatus: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Attendance styles
  attendanceList: {
    marginTop: 10,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  attendanceLeft: {
    flex: 1,
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  attendanceTime: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  attendanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceType: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginRight: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  viewAllText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
    marginRight: 5,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '500',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
  
  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 15,
  },
  actionText: {
    fontSize: 12,
    color: '#212529',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Bottom space for tab navigator
  bottomSpace: {
    height: Platform.OS === 'ios' ? 90 : 70,
  },
});