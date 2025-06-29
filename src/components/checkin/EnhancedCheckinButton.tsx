// src/components/checkin/EnhancedCheckinButton.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService } from '../../services/firebase/multiMembershipService';
import { BiometricService } from '../../services/biometric/BiometricService';

interface EnhancedCheckinButtonProps {
  onCheckinSuccess?: () => void;
  onCheckinError?: (error: string) => void;
  disabled?: boolean;
}

export const EnhancedCheckinButton: React.FC<EnhancedCheckinButtonProps> = ({
  onCheckinSuccess,
  onCheckinError,
  disabled = false
}) => {
  const { memberInfo, gymInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [lastCheckinTime, setLastCheckinTime] = useState<Date | null>(null);
  const [pulseAnimation] = useState(new Animated.Value(1));

  // Verificar soporte biométrico al cargar
  useEffect(() => {
    checkBiometricSupport();
    loadLastCheckin();
    startPulseAnimation();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const support = await BiometricService.checkDeviceSupport();
      setBiometricsSupported(support.isSupported);
      console.log('🔐 Soporte biométrico:', support.isSupported);
    } catch (error) {
      console.error('Error verificando biométricos:', error);
      setBiometricsSupported(false);
    }
  };

  const loadLastCheckin = async () => {
    try {
      if (!memberInfo) return;
      
      const memberships = await multiMembershipService.getUserMemberships(memberInfo.id);
      const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
      
      if (activeMembership) {
        const attendances = await multiMembershipService.getMembershipAttendance(activeMembership.id, 1);
        if (attendances.length > 0) {
          setLastCheckinTime(attendances[0].date.toDate());
        }
      }
    } catch (error) {
      console.error('Error cargando último check-in:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const canCheckinToday = (): boolean => {
    if (!lastCheckinTime) return true;
    
    const today = new Date();
    const lastCheckin = new Date(lastCheckinTime);
    
    // Verificar si ya hizo check-in hoy
    return !(
      today.getDate() === lastCheckin.getDate() &&
      today.getMonth() === lastCheckin.getMonth() &&
      today.getFullYear() === lastCheckin.getFullYear()
    );
  };

  const handleRegularCheckin = async () => {
    if (!memberInfo || !gymInfo) {
      Alert.alert('Error', 'Información de usuario no disponible');
      return;
    }

    setLoading(true);
    
    try {
      const memberships = await multiMembershipService.getUserMemberships(memberInfo.id);
      const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
      
      if (!activeMembership) {
        Alert.alert('Error', 'No tienes una membresía activa');
        return;
      }

      Alert.alert(
        '✅ Confirmar Check-in',
        `¿Confirmas tu entrada a ${gymInfo.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              const registered = await multiMembershipService.registerAttendance(
                activeMembership.id, 
                gymInfo.id
              );
              
              if (registered) {
                setLastCheckinTime(new Date());
                Alert.alert(
                  '🎉 Check-in Exitoso',
                  `Entrada registrada a las ${new Date().toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}`
                );
                onCheckinSuccess?.();
              } else {
                Alert.alert('Error', 'No se pudo registrar tu entrada');
                onCheckinError?.('Error registrando asistencia');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error en check-in regular:', error);
      Alert.alert('Error', 'No se pudo completar el check-in');
      onCheckinError?.('Error interno');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricCheckin = async () => {
    if (!memberInfo || !gymInfo) {
      Alert.alert('Error', 'Información de usuario no disponible');
      return;
    }

    setLoading(true);
    
    try {
      const memberships = await multiMembershipService.getUserMemberships(memberInfo.id);
      const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
      
      if (!activeMembership) {
        Alert.alert('Error', 'No tienes una membresía activa');
        return;
      }

      await BiometricService.performBiometricCheckin(
        activeMembership.id,
        gymInfo.id,
        () => {
          setLastCheckinTime(new Date());
          onCheckinSuccess?.();
        },
        (error) => {
          Alert.alert('Error', error);
          onCheckinError?.(error);
        }
      );
      
    } catch (error) {
      console.error('Error en check-in biométrico:', error);
      Alert.alert('Error', 'No se pudo completar el check-in biométrico');
      onCheckinError?.('Error interno');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinPress = () => {
    if (disabled || loading) return;
    
    if (!canCheckinToday()) {
      Alert.alert(
        'Ya registraste tu entrada',
        'Ya hiciste check-in hoy. ¿Quieres registrar otra visita?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', onPress: () => biometricsSupported ? handleBiometricCheckin() : handleRegularCheckin() }
        ]
      );
      return;
    }

    if (biometricsSupported) {
      handleBiometricCheckin();
    } else {
      handleRegularCheckin();
    }
  };

  const getButtonText = () => {
    if (loading) return 'Procesando...';
    if (!canCheckinToday()) return 'Check-in Adicional';
    return 'Check-in Rápido';
  };

  const getButtonIcon = () => {
    if (loading) return null;
    if (biometricsSupported) return 'finger-print';
    return 'qr-code';
  };

  const getSubtext = () => {
    if (loading) return 'Registrando entrada...';
    if (biometricsSupported) return 'Toca y usa tu huella digital';
    if (!canCheckinToday()) return 'Ya registraste entrada hoy';
    return 'Toca para registrar entrada';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.checkinButton,
        !canCheckinToday() && styles.checkinButtonSecondary,
        disabled && styles.checkinButtonDisabled,
        { transform: [{ scale: loading ? 1 : pulseAnimation }] }
      ]}>
        <TouchableOpacity
          style={styles.checkinTouchable}
          onPress={handleCheckinPress}
          disabled={disabled || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              {getButtonIcon() && (
                <Ionicons 
                  name={getButtonIcon() as any} 
                  size={32} 
                  color="#ffffff" 
                  style={styles.checkinIcon}
                />
              )}
              <Text style={styles.checkinText}>{getButtonText()}</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      <Text style={styles.subtextStyle}>{getSubtext()}</Text>
      
      {lastCheckinTime && (
        <Text style={styles.lastCheckinText}>
          Última entrada: {lastCheckinTime.toLocaleDateString('es-AR')} a las{' '}
          {lastCheckinTime.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      )}
      
      {biometricsSupported && (
        <View style={styles.biometricBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#28a745" />
          <Text style={styles.biometricText}>Protegido con biométricos</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  checkinButton: {
    backgroundColor: '#28a745',
    borderRadius: 75,
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 15,
  },
  checkinButtonSecondary: {
    backgroundColor: '#007bff',
  },
  checkinButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  checkinTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 75,
  },
  checkinIcon: {
    marginBottom: 8,
  },
  checkinText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  subtextStyle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  lastCheckinText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 10,
  },
  biometricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  biometricText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    marginLeft: 5,
  },
});