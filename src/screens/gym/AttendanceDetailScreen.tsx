// src/screens/gym/AttendanceDetailScreen.tsx
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService, MembershipAttendance } from '../../services/firebase/multiMembershipService';

export const AttendanceDetailScreen: React.FC = () => {
  const { memberInfo, gymInfo } = useAuth();
  const [attendances, setAttendances] = useState<MembershipAttendance[]>([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    thisMonthVisits: 0,
    thisWeekVisits: 0,
    averageVisitsPerWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAttendanceData = async (showRefresh = false) => {
    try {
      if (!memberInfo) return;

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      // Obtener membresías y asistencias
      const memberships = await multiMembershipService.getUserMemberships(memberInfo.id);
      const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
      
      if (activeMembership) {
        // Cargar todas las asistencias
        const attendanceData = await multiMembershipService.getMembershipAttendance(activeMembership.id, 50);
        setAttendances(attendanceData);
        
        // Calcular estadísticas
        const statsData = await multiMembershipService.getMonthlyStats(memberInfo.id);
        setStats(statsData);
      }

    } catch (error) {
      console.error('❌ Error cargando asistencias:', error);
      Alert.alert('Error', 'No se pudieron cargar las asistencias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (memberInfo) {
      loadAttendanceData();
    }
  }, [memberInfo]);

  const formatDate = (timestamp: any) => {
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatTime = (time: string) => {
    return time || '00:00';
  };

  const groupAttendancesByMonth = () => {
    const grouped: { [key: string]: MembershipAttendance[] } = {};
    
    attendances.forEach(attendance => {
      try {
        const date = attendance.date.toDate();
        const monthKey = date.toLocaleDateString('es-AR', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(attendance);
      } catch (error) {
        console.log('Error agrupando fecha:', error);
      }
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.loadingText}>Cargando asistencias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedAttendances = groupAttendancesByMonth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Mis Asistencias</Text>
        <Text style={styles.headerSubtitle}>{gymInfo?.name}</Text>
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAttendanceData(true)}
            colors={['#28a745']}
          />
        }
      >
        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.thisMonthVisits}</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.thisWeekVisits}</Text>
            <Text style={styles.statLabel}>Esta semana</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalVisits}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Historial por mes */}
        {Object.keys(groupedAttendances).length > 0 ? (
          Object.entries(groupedAttendances).map(([month, monthAttendances]) => (
            <View key={month} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{month.toUpperCase()}</Text>
              
              {monthAttendances.map((attendance, index) => (
                <View key={attendance.id || index} style={styles.attendanceItem}>
                  <View style={styles.attendanceLeft}>
                    <Text style={styles.attendanceDate}>
                      {formatDate(attendance.date)}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {formatTime(attendance.time)}
                    </Text>
                  </View>
                  
                  <View style={styles.attendanceRight}>
                    <View style={styles.attendanceType}>
                      <Ionicons 
                        name={attendance.type === 'check-in' ? 'enter-outline' : 'exit-outline'} 
                        size={20} 
                        color="#28a745" 
                      />
                      <Text style={styles.attendanceTypeText}>
                        {attendance.type === 'check-in' ? 'Entrada' : 'Salida'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#6c757d" />
            <Text style={styles.emptyTitle}>Sin asistencias registradas</Text>
            <Text style={styles.emptySubtitle}>
              Tus visitas al gimnasio aparecerán aquí
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#28a745',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#28a745',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#28a745',
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
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  
  // Month sections
  monthSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  
  // Attendance items
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    textTransform: 'capitalize',
  },
  attendanceTime: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  attendanceRight: {
    alignItems: 'flex-end',
  },
  attendanceType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceTypeText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    marginLeft: 5,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c757d',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
});