// src/screens/gym/RoutinesScreen.tsx - FIX ERROR TYPESCRIPT
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService, RoutineInfo } from '../../services/firebase/multiMembershipService';

export const RoutinesScreen: React.FC = () => {
  const { memberInfo, gymInfo } = useAuth();
  const [routines, setRoutines] = useState<RoutineInfo[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineInfo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutines = async (showRefresh = false) => {
    try {
      if (!memberInfo || !gymInfo) return;

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      // 🔧 FIX: Agregar debug primero
      await multiMembershipService.debugRoutineStructure(memberInfo.id, gymInfo.id);

      const routineData = await multiMembershipService.getUserRoutines(memberInfo.id, gymInfo.id);
      setRoutines(routineData);

    } catch (error) {
      console.error('❌ Error cargando rutinas:', error);
      // 🔧 FIX: Manejar error como unknown
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudieron cargar las rutinas: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (memberInfo && gymInfo) {
      loadRoutines();
    }
  }, [memberInfo, gymInfo]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#28a745';
      case 'intermediate': return '#ffc107';
      case 'advanced': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Principiante';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzado';
      default: return 'Sin definir';
    }
  };

  const renderExerciseDay = (dayKey: string, exercises: any[]) => {
    if (!exercises || exercises.length === 0) return null;

    return (
      <View key={dayKey} style={styles.exerciseDay}>
        <Text style={styles.exerciseDayTitle}>
          {dayKey.replace('day', 'Día ')}
        </Text>
        
        {exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>{exercise.name || exercise.exerciseName || 'Ejercicio'}</Text>
            <Text style={styles.exerciseDetails}>
              {exercise.sets || 3} series × {exercise.reps || '12'} repeticiones
              {exercise.weight && ` • ${exercise.weight}kg`}
              {exercise.rest && ` • Descanso: ${exercise.rest}s`}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6f42c1" />
          <Text style={styles.loadingText}>Cargando rutinas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏋️ Mis Rutinas</Text>
        <Text style={styles.headerSubtitle}>Entrenamientos asignados</Text>
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRoutines(true)}
            colors={['#6f42c1']}
          />
        }
      >
        {routines.length > 0 ? (
          routines.map((routine) => (
            <TouchableOpacity
              key={routine.id}
              style={styles.routineCard}
              onPress={() => {
                setSelectedRoutine(routine);
                setModalVisible(true);
              }}
            >
              <View style={styles.routineHeader}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <View style={[
                  styles.levelBadge,
                  { backgroundColor: getLevelColor(routine.level) }
                ]}>
                  <Text style={styles.levelText}>
                    {getLevelText(routine.level)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.routineDescription} numberOfLines={2}>
                {routine.description || 'Sin descripción'}
              </Text>
              
              <View style={styles.routineDetails}>
                <View style={styles.routineDetail}>
                  <Ionicons name="calendar-outline" size={16} color="#6c757d" />
                  <Text style={styles.routineDetailText}>
                    {routine.daysPerWeek} días/semana
                  </Text>
                </View>
                
                <View style={styles.routineDetail}>
                  <Ionicons name="time-outline" size={16} color="#6c757d" />
                  <Text style={styles.routineDetailText}>
                    {routine.duration} semanas
                  </Text>
                </View>
                
                <View style={styles.routineDetail}>
                  <Ionicons name="flag-outline" size={16} color="#6c757d" />
                  <Text style={styles.routineDetailText}>
                    {routine.goal}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>Ver Ejercicios</Text>
                <Ionicons name="chevron-forward" size={16} color="#6f42c1" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#6c757d" />
            <Text style={styles.emptyTitle}>Sin rutinas asignadas</Text>
            <Text style={styles.emptySubtitle}>
              Consulta con tu entrenador para que te asigne una rutina
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de detalle de rutina */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#6f42c1" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedRoutine?.name}
            </Text>
            <View style={styles.placeholder} />
          </View>
          
          {selectedRoutine && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                {selectedRoutine.description}
              </Text>
              
              <View style={styles.modalStats}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatNumber}>
                    {selectedRoutine.daysPerWeek}
                  </Text>
                  <Text style={styles.modalStatLabel}>Días/semana</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatNumber}>
                    {selectedRoutine.duration}
                  </Text>
                  <Text style={styles.modalStatLabel}>Semanas</Text>
                </View>
              </View>
              
              {/* Ejercicios por día */}
              <View style={styles.exercisesContainer}>
                <Text style={styles.exercisesTitle}>Ejercicios:</Text>
                
                {selectedRoutine.exercises && Object.entries(selectedRoutine.exercises).map(([dayKey, exercises]) =>
                  renderExerciseDay(dayKey, exercises as any[])
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Mantener todos los estilos igual que tenías
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6f42c1',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#6f42c1',
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
  
  // Routine cards
  routineCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routineDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    lineHeight: 20,
  },
  routineDetails: {
    marginBottom: 15,
  },
  routineDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routineDetailText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  viewButtonText: {
    fontSize: 16,
    color: '#6f42c1',
    fontWeight: '500',
    marginRight: 5,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 30,
  },
  modalStat: {
    alignItems: 'center',
  },
  modalStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6f42c1',
  },
  modalStatLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  exercisesContainer: {
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 20,
  },
  exerciseDay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  exerciseDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6f42c1',
    marginBottom: 10,
  },
  exerciseItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 5,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#6c757d',
  },
  
  // Empty states
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