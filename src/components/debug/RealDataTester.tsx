// src/components/debug/RealDataTester.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService } from '../../services/firebase/multiMembershipService';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface TestResults {
  [key: string]: TestResult;
}

export const RealDataTester: React.FC = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResults>({});

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setLoading(true);
    try {
      console.log(`🧪 Ejecutando test: ${testName}`);
      const result = await testFunction();
      setTestResults((prev: TestResults) => ({
        ...prev,
        [testName]: {
          success: true,
          data: result,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      Alert.alert('✅ Test Exitoso', `${testName} completado`);
    } catch (error: any) {
      console.error(`❌ Error en test ${testName}:`, error);
      setTestResults((prev: TestResults) => ({
        ...prev,
        [testName]: {
          success: false,
          error: error?.message || 'Error desconocido',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      Alert.alert('❌ Test Fallido', `Error en ${testName}: ${error?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const testMemberships = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    return await multiMembershipService.getUserMemberships(user.uid);
  };

  const testAttendances = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    const memberships = await multiMembershipService.getUserMemberships(user.uid);
    if (memberships.length === 0) throw new Error('No hay membresías');
    return await multiMembershipService.getMembershipAttendance(memberships[0].id, 10);
  };

  const testPayments = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    const memberships = await multiMembershipService.getUserMemberships(user.uid);
    if (memberships.length === 0) throw new Error('No hay membresías');
    return await multiMembershipService.getMembershipPayments(memberships[0].id, 5);
  };

  const testRoutines = async () => {
    if (!user || !gymInfo) throw new Error('Usuario o gimnasio no disponible');
    return await multiMembershipService.getUserRoutines(user.uid, gymInfo.id);
  };

  const testStats = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    return await multiMembershipService.getMonthlyStats(user.uid);
  };

  const testDebugMember = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    return await multiMembershipService.debugFindMemberByUserId(user.uid);
  };

  const testMembershipAssignments = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    const debugResult = await multiMembershipService.debugFindMemberByUserId(user.uid);
    if (!debugResult?.memberId) throw new Error('No se encontró memberId');
    return await multiMembershipService.debugMembershipAssignments(debugResult.memberId);
  };

  const testCheckin = async () => {
    if (!user) throw new Error('Usuario no autenticado');
    const memberships = await multiMembershipService.getUserMemberships(user.uid);
    if (memberships.length === 0) throw new Error('No hay membresías');
    const activeMembership = memberships.find(m => m.status === 'active') || memberships[0];
    return await multiMembershipService.registerAttendance(activeMembership.id, activeMembership.gymId);
  };

  const renderTestResult = (testName: string) => {
    const result = testResults[testName];
    if (!result) return null;

    return (
      <View style={[styles.resultCard, result.success ? styles.successCard : styles.errorCard]}>
        <View style={styles.resultHeader}>
          <Ionicons 
            name={result.success ? 'checkmark-circle' : 'close-circle'} 
            size={20} 
            color={result.success ? '#28a745' : '#dc3545'} 
          />
          <Text style={styles.resultTitle}>{testName}</Text>
          <Text style={styles.resultTime}>{result.timestamp}</Text>
        </View>
        
        {result.success ? (
          <View style={styles.resultData}>
            <Text style={styles.dataTitle}>Datos obtenidos:</Text>
            <Text style={styles.dataText}>
              {JSON.stringify(result.data, null, 2).substring(0, 200)}...
            </Text>
            {Array.isArray(result.data) && (
              <Text style={styles.dataCount}>
                Total de elementos: {result.data.length}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.errorText}>Error: {result.error}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Tester de Datos Reales</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.infoText}>👤 Usuario: {user?.email}</Text>
        <Text style={styles.infoText}>🆔 UID: {user?.uid?.substring(0, 8)}...</Text>
        {memberInfo && (
          <Text style={styles.infoText}>
            👥 Miembro: {memberInfo.firstName} {memberInfo.lastName}
          </Text>
        )}
        {gymInfo && (
          <Text style={styles.infoText}>🏢 Gimnasio: {gymInfo.name}</Text>
        )}
      </View>

      <ScrollView style={styles.testsContainer}>
        {/* Tests básicos */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Tests Básicos</Text>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Debug Miembro', testDebugMember)}
            disabled={loading}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.testButtonText}>🔍 Buscar Miembro Real</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.specialButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Investigar Memberships', testMembershipAssignments)}
            disabled={loading}
          >
            <Ionicons name="flask" size={20} color="#fff" />
            <Text style={styles.testButtonText}>🔬 Investigar Estructura Memberships</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Membresías', testMemberships)}
            disabled={loading}
          >
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.testButtonText}>🎫 Obtener Membresías</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Estadísticas', testStats)}
            disabled={loading}
          >
            <Ionicons name="stats-chart" size={20} color="#fff" />
            <Text style={styles.testButtonText}>📊 Calcular Estadísticas</Text>
          </TouchableOpacity>
        </View>

        {/* Tests de datos */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Tests de Datos</Text>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Asistencias', testAttendances)}
            disabled={loading}
          >
            <Ionicons name="calendar" size={20} color="#fff" />
            <Text style={styles.testButtonText}>📅 Obtener Asistencias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Pagos', testPayments)}
            disabled={loading}
          >
            <Ionicons name="wallet" size={20} color="#fff" />
            <Text style={styles.testButtonText}>💰 Obtener Pagos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Rutinas', testRoutines)}
            disabled={loading}
          >
            <Ionicons name="fitness" size={20} color="#fff" />
            <Text style={styles.testButtonText}>🏋️ Obtener Rutinas</Text>
          </TouchableOpacity>
        </View>

        {/* Tests de funcionalidad */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Tests de Funcionalidad</Text>
          
          <TouchableOpacity
            style={[styles.testButton, styles.dangerButton, loading && styles.testButtonDisabled]}
            onPress={() => runTest('Check-in', testCheckin)}
            disabled={loading}
          >
            <Ionicons name="log-in" size={20} color="#fff" />
            <Text style={styles.testButtonText}>✅ Registrar Check-in</Text>
          </TouchableOpacity>
        </View>

        {/* Resultados */}
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Resultados de Tests</Text>
          
          {Object.keys(testResults).map(testName => (
            <View key={testName}>
              {renderTestResult(testName)}
            </View>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Ejecutando test...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  testsContainer: {
    flex: 1,
  },
  testSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  specialButton: {
    backgroundColor: '#6f42c1',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  resultsSection: {
    marginTop: 20,
  },
  resultCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 10,
  },
  resultTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  resultData: {
    marginTop: 10,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 5,
  },
  dataText: {
    fontSize: 12,
    color: '#155724',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 4,
  },
  dataCount: {
    fontSize: 14,
    color: '#155724',
    fontWeight: 'bold',
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#721c24',
    fontWeight: '500',
  },
  loadingOverlay: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007bff',
  },
});