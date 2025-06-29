// src/services/biometric/BiometricService.ts
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

export interface BiometricCheckResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

export const BiometricService = {
  // Verificar si el dispositivo soporta biométricos
  checkDeviceSupport: async (): Promise<{
    isSupported: boolean;
    hasHardware: boolean;
    isEnrolled: boolean;
    availableTypes: LocalAuthentication.AuthenticationType[];
  }> => {
    try {
      console.log('🔍 Verificando soporte biométrico...');
      
      // Verificar si hay hardware biométrico
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      console.log('📱 Hardware biométrico:', hasHardware);
      
      // Verificar si hay biométricos registrados
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('👆 Biométricos registrados:', isEnrolled);
      
      // Obtener tipos disponibles
      const availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('🔐 Tipos disponibles:', availableTypes);
      
      return {
        isSupported: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        availableTypes
      };
      
    } catch (error) {
      console.error('❌ Error verificando soporte biométrico:', error);
      return {
        isSupported: false,
        hasHardware: false,
        isEnrolled: false,
        availableTypes: []
      };
    }
  },

  // Obtener texto descriptivo del tipo de biométrico
  getBiometricTypeText: (types: LocalAuthentication.AuthenticationType[]): string => {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Huella Digital';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Escaneo de Iris';
    } else {
      return 'Autenticación Biométrica';
    }
  },

  // Realizar autenticación biométrica
  authenticateAsync: async (reason: string = 'Confirma tu identidad para continuar'): Promise<BiometricCheckResult> => {
    try {
      console.log('🔐 Iniciando autenticación biométrica...');
      
      // Verificar soporte primero
      const support = await BiometricService.checkDeviceSupport();
      
      if (!support.hasHardware) {
        return {
          success: false,
          error: 'Tu dispositivo no tiene hardware biométrico'
        };
      }
      
      if (!support.isEnrolled) {
        return {
          success: false,
          error: 'No tienes datos biométricos registrados en tu dispositivo'
        };
      }
      
      // Realizar autenticación
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        console.log('✅ Autenticación biométrica exitosa');
        return {
          success: true,
          biometricType: BiometricService.getBiometricTypeText(support.availableTypes)
        };
      } else {
        console.log('❌ Autenticación biométrica falló:', result.error);
        return {
          success: false,
          error: result.error || 'Autenticación cancelada'
        };
      }
      
    } catch (error) {
      console.error('❌ Error en autenticación biométrica:', error);
      return {
        success: false,
        error: 'Error interno de autenticación'
      };
    }
  },

  // Check-in con biométrica
  performBiometricCheckin: async (
    membershipId: string, 
    gymId: string,
    onSuccess: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      console.log('🏋️ Iniciando check-in biométrico...');
      
      // Mostrar alerta de confirmación
      Alert.alert(
        '🔐 Check-in Biométrico',
        'Usa tu huella digital o Face ID para confirmar tu entrada al gimnasio',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Continuar',
            onPress: async () => {
              // Realizar autenticación biométrica
              const authResult = await BiometricService.authenticateAsync(
                'Confirma tu entrada al gimnasio'
              );
              
              if (authResult.success) {
                // Registrar asistencia
                try {
                  const { multiMembershipService } = await import('../firebase/multiMembershipService');
                  const registered = await multiMembershipService.registerAttendance(membershipId, gymId);
                  
                  if (registered) {
                    console.log('✅ Check-in registrado exitosamente');
                    Alert.alert(
                      '✅ Check-in Exitoso',
                      `Entrada confirmada con ${authResult.biometricType}\n\nHora: ${new Date().toLocaleTimeString('es-AR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}`,
                      [{ text: 'Genial!', onPress: onSuccess }]
                    );
                  } else {
                    onError('No se pudo registrar la asistencia');
                  }
                } catch (error) {
                  console.error('❌ Error registrando asistencia:', error);
                  onError('Error al registrar la asistencia');
                }
              } else {
                onError(authResult.error || 'Autenticación fallida');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error en check-in biométrico:', error);
      onError('Error interno del check-in');
    }
  },

  // Configuración inicial de biométricos
  setupBiometrics: async (): Promise<{
    configured: boolean;
    message: string;
  }> => {
    try {
      const support = await BiometricService.checkDeviceSupport();
      
      if (!support.hasHardware) {
        return {
          configured: false,
          message: 'Tu dispositivo no soporta autenticación biométrica'
        };
      }
      
      if (!support.isEnrolled) {
        Alert.alert(
          'Configurar Biométricos',
          'Para usar el check-in rápido, necesitas configurar tu huella digital o Face ID en la configuración de tu dispositivo.',
          [
            { text: 'Más tarde', style: 'cancel' },
            { 
              text: 'Ir a Configuración', 
              onPress: () => {
                // En una app real, aquí abriríamos la configuración del dispositivo
                console.log('Abriendo configuración del dispositivo...');
              }
            }
          ]
        );
        
        return {
          configured: false,
          message: 'Necesitas configurar datos biométricos en tu dispositivo'
        };
      }
      
      return {
        configured: true,
        message: `${BiometricService.getBiometricTypeText(support.availableTypes)} configurado correctamente`
      };
      
    } catch (error) {
      return {
        configured: false,
        message: 'Error verificando configuración biométrica'
      };
    }
  }
}; 