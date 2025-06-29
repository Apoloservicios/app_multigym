// src/screens/main/AttendanceScreen.tsx (CORREGIDA)
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { memberDataService } from '../../services/firebase/memberDataService';

// Usar las mismas interfaces que memberDataService
interface AttendanceRecord {
  id: string;
  date: any; // Timestamp
  time: string;
  type: 'check-in' | 'check-out';
  memberId: string;
  duration?: number;
}

interface AttendanceStats {
  totalVisits: number;
  thisMonthVisits: number;
  thisWeekVisits: number;
  averageWeeklyVisits: number;
  lastVisit: Date | null;
  longestStreak: number;
  currentStreak: number;
}

export const AttendanceScreen: React.FC = () => {
  const { memberInfo, gymInfo } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<{
    isCheckedIn: boolean;
    lastCheckIn?: AttendanceRecord;
    canCheckOut: boolean;
  }>({ isCheckedIn: false, canCheckOut: false });
  
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const loadAttendanceData = async () => {
    try {
      if (!memberInfo || !gymInfo) return;

      console.log('📊 Cargando datos de asistencia...');

      // Usar memberDataService para consistencia
      const recentAttendances = await memberDataService.getRecentAttendance(
        gymInfo.id, 
        memberInfo.id, 
        20
      );

      setAttendances(recentAttendances);

      // Calcular estadísticas manualmente
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeekStart = getStartOfWeek(now);

      const thisMonthVisits = recentAttendances.filter(att => 
        att.date.toDate() >= thisMonthStart
      ).length;

      const thisWeekVisits = recentAttendances.filter(att => 
        att.date.toDate() >= thisWeekStart
      ).length;

      const lastVisit = recentAttendances.length > 0 ? recentAttendances[0].date.toDate() : null;

      // Calcular rachas (simplificado)
      const currentStreak = calculateCurrentStreak(recentAttendances);
      const longestStreak = calculateLongestStreak(recentAttendances);

      // Promedio semanal (últimas 4 semanas)
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      const recentVisits = recentAttendances.filter(att => 
        att.date.toDate() >= fourWeeksAgo
      ).length;
      const averageWeeklyVisits = Math.round(recentVisits / 4);

      const calculatedStats: AttendanceStats = {
        totalVisits: recentAttendances.length,
        thisMonthVisits,
        thisWeekVisits,
        averageWeeklyVisits,
        lastVisit,
        longestStreak,
        currentStreak
      };

      setStats(calculatedStats);

      // Verificar estado actual (si hay check-in hoy)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendances = recentAttendances.filter(att => {
        const attDate = att.date.toDate();
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });

      if (todayAttendances.length > 0) {
        const lastTodayAttendance = todayAttendances[0];
        setCurrentStatus({
          isCheckedIn: lastTodayAttendance.type === 'check-in',
          lastCheckIn: lastTodayAttendance,
          canCheckOut: lastTodayAttendance.type === 'check-in'
        });
      } else {
        setCurrentStatus({
          isCheckedIn: false,
          canCheckOut: false
        });
      }

      console.log('✅ Datos de asistencia cargados');

    } catch (error) {
      console.error('❌ Error cargando asistencias:', error);
      Alert.alert('Error', 'No se pudieron cargar las asistencias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [memberInfo, gymInfo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceData();
  };

  const handleCheckIn = async () => {
    if (!memberInfo || !gymInfo) return;

    Alert.alert(
      '🏋️ Check-in',
      `¿Confirmar tu entrada a ${gymInfo.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setActionLoading(true);
            try {
              // Simular check-in exitoso por ahora
              // TODO: Implementar attendanceService.checkIn() cuando esté listo
              Alert.alert('✅ ¡Check-in exitoso!', 'Disfruta tu entrenamiento');
              await loadAttendanceData();
              
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo registrar el check-in');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCheckOut = async () => {
    if (!memberInfo || !gymInfo) return;

    Alert.alert(
      '🚪 Check-out',
      '¿Confirmar tu salida del gimnasio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setActionLoading(true);
            try {
              // Simular check-out exitoso por ahora
              Alert.alert('✅ ¡Check-out exitoso!', 'Hasta la próxima');
              await loadAttendanceData();
              
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo registrar el check-out');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (timestamp: any): string => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatTime = (time: string): string => {
    try {
      return time || '--:--';
    } catch {
      return '--:--';
    }
  };

  // Funciones auxiliares
  function getStartOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando asistencias...</Text>
      </View>
    );
  }

  if (!memberInfo || !gymInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error al cargar datos</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏋️ Asistencias</Text>
        <Text style={styles.headerSubtitle}>{gymInfo.name}</Text>
      </View>

      {/* Estado Actual */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, {
            backgroundColor: currentStatus.isCheckedIn ? '#28a745' : '#6c757d'
          }]} />
          <Text style={styles.statusTitle}>
            {currentStatus.isCheckedIn ? 'Dentro del gimnasio' : 'Fuera del gimnasio'}
          </Text>
        </View>
        
        {currentStatus.lastCheckIn && currentStatus.isCheckedIn && (
          <Text style={styles.statusDetails}>
            Entrada: {formatTime(currentStatus.lastCheckIn.time || '')} - {formatDate(currentStatus.lastCheckIn.date)}
          </Text>
        )}

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.checkInButton,
              currentStatus.isCheckedIn && styles.disabledButton
            ]}
            onPress={handleCheckIn}
            disabled={currentStatus.isCheckedIn || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="enter" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Check-in</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.checkOutButton,
              !currentStatus.canCheckOut && styles.disabledButton
            ]}
            onPress={handleCheckOut}
            disabled={!currentStatus.canCheckOut || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="exit" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Check-out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas Rápidas */}
      {stats && (
        <View style={styles.quickStatsContainer}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => setShowStatsModal(true)}
          >
            <Ionicons name="calendar" size={24} color="#007bff" />
            <Text style={styles.statNumber}>{stats.thisMonthVisits}</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#ffc107" />
            <Text style={styles.statNumber}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#28a745" />
            <Text style={styles.statNumber}>{stats.averageWeeklyVisits}</Text>
            <Text style={styles.statLabel}>Promedio semanal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Historial de Asistencias */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>📋 Historial Reciente</Text>
        
        {attendances.length > 0 ? (
          attendances.slice(0, 10).map((attendance, index) => (
            <View key={attendance.id || index} style={styles.attendanceItem}>
              <View style={styles.attendanceDate}>
                <Text style={styles.attendanceDateText}>
                  {formatDate(attendance.date)}
                </Text>
              </View>
              
              <View style={styles.attendanceDetails}>
                <View style={styles.timeRow}>
                  <View style={styles.timeItem}>
                    <Ionicons name="enter" size={16} color="#28a745" />
                    <Text style={styles.timeText}>
                      {formatTime(attendance.time || '')}
                    </Text>
                  </View>
                </View>
                
                {attendance.duration && (
                  <Text style={styles.durationText}>
                    Duración: {formatDuration(attendance.duration)}
                  </Text>
                )}
              </View>
              
              <View style={[styles.statusBadge, {
                backgroundColor: attendance.type === 'check-out' ? '#28a745' : '#ffc107'
              }]}>
                <Text style={styles.statusBadgeText}>
                  {attendance.type === 'check-in' ? 'Entrada' : 'Salida'}
                </Text>
              </View>
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

      {/* Modal de Estadísticas Detalladas */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 Estadísticas Detalladas</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)}>
              <Ionicons name="close" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>
          
          {stats && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Total de visitas:</Text>
                <Text style={styles.modalStatValue}>{stats.totalVisits}</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Visitas este mes:</Text>
                <Text style={styles.modalStatValue}>{stats.thisMonthVisits}</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Visitas esta semana:</Text>
                <Text style={styles.modalStatValue}>{stats.thisWeekVisits}</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Promedio semanal:</Text>
                <Text style={styles.modalStatValue}>{stats.averageWeeklyVisits}</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Racha actual:</Text>
                <Text style={styles.modalStatValue}>{stats.currentStreak} días</Text>
              </View>
              
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Racha más larga:</Text>
                <Text style={styles.modalStatValue}>{stats.longestStreak} días</Text>
              </View>
              
              {stats.lastVisit && (
                <View style={styles.modalStatRow}>
                  <Text style={styles.modalStatLabel}>Última visita:</Text>
                  <Text style={styles.modalStatValue}>
                    {stats.lastVisit.toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

// Los estilos son los mismos que en la versión anterior
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
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
  },
  checkInButton: {
    backgroundColor: '#28a745',
  },
  checkOutButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 15,
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
  historySection: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  attendanceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceDate: {
    width: 80,
    alignItems: 'center',
  },
  attendanceDateText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  attendanceDetails: {
    flex: 1,
    marginLeft: 15,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 5,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  durationText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noDataContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 15,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  modalStatLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  bottomSpacing: {
    height: 30,
  },
});