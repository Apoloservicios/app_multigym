// src/components/checkin/QuickActionsGrid.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsGridProps {
  onNavigateToRoutines?: () => void;
  onNavigateToAttendance?: () => void;
  onNavigateToPayments?: () => void;
  onOpenSupport?: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onNavigateToRoutines,
  onNavigateToAttendance,
  onNavigateToPayments,
  onOpenSupport
}) => {
  const quickActions: QuickAction[] = [
    {
      id: 'routines',
      icon: 'fitness',
      title: 'Mis Rutinas',
      color: '#6f42c1',
      onPress: () => {
        onNavigateToRoutines?.();
      }
    },
    {
      id: 'attendance',
      icon: 'calendar',
      title: 'Asistencias',
      color: '#28a745',
      onPress: () => {
        onNavigateToAttendance?.();
      }
    },
    {
      id: 'payments',
      icon: 'card',
      title: 'Pagos',
      color: '#ffc107',
      onPress: () => {
        onNavigateToPayments?.();
      }
    },
    {
      id: 'schedule',
      icon: 'time',
      title: 'Horarios',
      color: '#17a2b8',
      onPress: () => {
        Alert.alert(
          'Horarios del Gimnasio',
          'Lunes a Viernes: 6:00 - 22:00\nSábados: 8:00 - 20:00\nDomingos: 9:00 - 18:00'
        );
      }
    },
    {
      id: 'qr',
      icon: 'qr-code',
      title: 'Mi QR',
      color: '#212529',
      onPress: () => {
        Alert.alert(
          'Código QR',
          'Muestra este código en recepción para acceso rápido',
          [{ text: 'Ver QR', onPress: () => console.log('Mostrar QR modal') }]
        );
      }
    },
    {
      id: 'support',
      icon: 'help-circle',
      title: 'Soporte',
      color: '#dc3545',
      onPress: () => {
        onOpenSupport?.();
      }
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accesos Rápidos</Text>
      
      <View style={styles.grid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color }]}>
              <Ionicons name={action.icon} size={24} color="#ffffff" />
            </View>
            <Text style={styles.actionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#212529',
    fontWeight: '500',
    textAlign: 'center',
  },
});