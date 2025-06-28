// src/screens/main/MultiMembershipDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { multiMembershipService, MembershipInfo } from '../../services/firebase/multiMembershipService';

export const MultiMembershipDashboard: React.FC = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  const [memberships, setMemberships] = useState<MembershipInfo[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<MembershipInfo | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembershipsData = async () => {
    try {
      if (!memberInfo) {
        setLoading(false);
        return;
      }

      console.log('🎫 Cargando membresías para:', memberInfo.firstName);

      // Debug de la estructura
      await multiMembershipService.debugMembershipStructure(memberInfo.id);

      // Cargar membresías y resumen
      const [userMemberships, membershipsSummary] = await Promise.all([
        multiMembershipService.getUserMemberships(memberInfo.id),
        multiMembershipService.getMembershipsSummary(memberInfo.id)
      ]);

      setMemberships(userMemberships);
      setSummary(membershipsSummary);

      // Seleccionar la primera membresía activa por defecto
      const activeMembership = userMemberships.find((m: MembershipInfo) => m.status === 'active') || userMemberships[0];
      setSelectedMembership(activeMembership || null);

      console.log('✅ Membresías cargadas:', userMemberships.length);

    } catch (error) {
      console.error('❌ Error cargando membresías:', error);
      Alert.alert('Error', 'No se pudieron cargar las membresías');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMembershipsData();
  }, [memberInfo]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMembershipsData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'expired': return '#dc3545';
      case 'suspended': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'expired': return 'Vencida';
      case 'suspended': return 'Suspendida';
      default: return status;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No especificado';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'No especificado';
    }
  };

  const calculateDaysRemaining = (endDate: any) => {
    if (!endDate) return 0;
    try {
      const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando tus membresías...</Text>
        {memberInfo && (
          <Text style={styles.loadingSubtext}>
            Bienvenido {memberInfo.firstName}
          </Text>
        )}
      </View>
    );
  }

  if (!memberInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudieron cargar los datos</Text>
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
        <Text style={styles.welcomeText}>¡Hola, {memberInfo.firstName} {memberInfo.lastName}!</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {/* Resumen de Membresías */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="fitness" size={24} color="#007bff" />
            <Text style={styles.summaryNumber}>{summary.activeMemberships}</Text>
            <Text style={styles.summaryLabel}>Activas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={24} color="#28a745" />
            <Text style={styles.summaryNumber}>3</Text>
            <Text style={styles.summaryLabel}>Este Mes</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet" size={24} color="#dc3545" />
            <Text style={styles.summaryNumber}>${summary.totalDebt.toLocaleString('es-AR')}</Text>
            <Text style={styles.summaryLabel}>Deuda</Text>
          </View>
        </View>
      )}

      {/* Lista de Membresías */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎫 Mis Membresías ({memberships.length})</Text>
        
        {memberships.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.noDataText}>No se encontraron membresías</Text>
            <Text style={styles.noDataSubtext}>
              Puede que tu cuenta no esté vinculada correctamente o que las membresías 
              estén en una estructura diferente en la base de datos.
            </Text>
          </View>
        ) : (
          memberships.map((membership, index) => (
            <TouchableOpacity
              key={membership.id}
              style={[
                styles.membershipCard,
                selectedMembership?.id === membership.id && styles.selectedMembershipCard
              ]}
              onPress={() => setSelectedMembership(membership)}
            >
              <View style={styles.membershipHeader}>
                <View>
                  <Text style={styles.membershipGym}>{membership.gymName}</Text>
                  <Text style={styles.membershipPlan}>{membership.planType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(membership.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(membership.status)}</Text>
                </View>
              </View>
              
              <View style={styles.membershipDetails}>
                <View style={styles.membershipDetailItem}>
                  <Ionicons name="calendar" size={16} color="#6c757d" />
                  <Text style={styles.membershipDetailText}>
                    Vence: {formatDate(membership.endDate)}
                  </Text>
                </View>
                <View style={styles.membershipDetailItem}>
                  <Ionicons name="time" size={16} color="#6c757d" />
                  <Text style={styles.membershipDetailText}>
                    {calculateDaysRemaining(membership.endDate)} días restantes
                  </Text>
                </View>
                {membership.totalDebt > 0 && (
                  <View style={styles.membershipDetailItem}>
                    <Ionicons name="warning" size={16} color="#dc3545" />
                    <Text style={[styles.membershipDetailText, { color: '#dc3545' }]}>
                      Deuda: ${membership.totalDebt.toLocaleString('es-AR')}
                    </Text>
                  </View>
                )}
                <View style={styles.membershipDetailItem}>
                  <Ionicons name="barbell" size={16} color="#007bff" />
                  <Text style={styles.membershipDetailText}>
                    Cuota: ${membership.monthlyFee.toLocaleString('es-AR')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Detalles de Membresía Seleccionada */}
      {selectedMembership && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Detalles de {selectedMembership.gymName}</Text>
          
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan:</Text>
              <Text style={styles.detailValue}>{selectedMembership.planType}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha de inicio:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedMembership.startDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha de vencimiento:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedMembership.endDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cuota mensual:</Text>
              <Text style={styles.detailValue}>${selectedMembership.monthlyFee.toLocaleString('es-AR')}</Text>
            </View>
            {selectedMembership.totalDebt > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Deuda pendiente:</Text>
                <Text style={[styles.detailValue, { color: '#dc3545', fontWeight: 'bold' }]}>
                  ${selectedMembership.totalDebt.toLocaleString('es-AR')}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estado:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedMembership.status) }]}>
                <Text style={styles.statusText}>{getStatusText(selectedMembership.status)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Acciones Rápidas */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="qr-code" size={24} color="#fff" />
          <Text style={styles.actionText}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="list" size={24} color="#fff" />
          <Text style={styles.actionText}>Asistencias</Text>
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
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 15,
    gap: 10,
  },
  summaryCard: {
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
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    marginHorizontal: 15,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  membershipCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedMembershipCard: {
    borderColor: '#007bff',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  membershipGym: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  membershipPlan: {
    fontSize: 14,
    color: '#6c757d',
  },
  membershipDetails: {
    gap: 5,
  },
  membershipDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membershipDetailText: {
    fontSize: 12,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 15,
    gap: 10,
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