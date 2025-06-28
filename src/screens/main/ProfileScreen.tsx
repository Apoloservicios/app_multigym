// src/screens/main/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, memberInfo, gymInfo, signOut, refreshMemberData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMemberData();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'No especificado';
    // Formatear teléfono argentino: 2604031110 -> +54 260 403-1110
    if (phone.length === 10 && phone.startsWith('26')) {
      return `+54 ${phone.slice(0, 3)} ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  if (!memberInfo || !gymInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
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
      {/* Header del Perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {memberInfo.firstName.charAt(0)}{memberInfo.lastName.charAt(0)}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>
          {memberInfo.firstName} {memberInfo.lastName}
        </Text>
        <Text style={styles.gymName}>📍 {gymInfo.name}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: memberInfo.status === 'active' ? '#28a745' : '#dc3545' 
        }]}>
          <Text style={styles.statusText}>
            {memberInfo.status === 'active' ? 'Miembro Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      {/* Información Personal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Información Personal</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="mail" size={20} color="#007bff" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {memberInfo.email || 'No especificado'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="call" size={20} color="#007bff" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>
                  {formatPhone(memberInfo.phone)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={20} color="#007bff" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>
                  {memberInfo.address || 'No especificada'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#007bff" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                <Text style={styles.infoValue}>
                  {formatDate(memberInfo.birthDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Información del Gimnasio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏋️ Mi Gimnasio</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="business" size={20} color="#28a745" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{gymInfo.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={20} color="#28a745" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Propietario</Text>
                <Text style={styles.infoValue}>{gymInfo.owner}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={20} color="#28a745" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{gymInfo.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="call" size={20} color="#28a745" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>
                  {formatPhone(gymInfo.phone)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Estado Financiero */}
      {memberInfo.totalDebt !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Estado Financiero</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons 
                  name={memberInfo.totalDebt > 0 ? "warning" : "checkmark-circle"} 
                  size={20} 
                  color={memberInfo.totalDebt > 0 ? "#ffc107" : "#28a745"} 
                />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Deuda Total</Text>
                  <Text style={[styles.infoValue, {
                    color: memberInfo.totalDebt > 0 ? "#dc3545" : "#28a745"
                  }]}>
                    ${memberInfo.totalDebt.toLocaleString('es-AR')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Información de Cuenta */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 Información de Cuenta</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="person-circle" size={20} color="#6c757d" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Usuario Firebase</Text>
                <Text style={styles.infoValue}>
                  {user?.email || 'No especificado'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#6c757d" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Miembro desde</Text>
                <Text style={styles.infoValue}>
                  {formatDate(memberInfo.createdAt?.toDate?.()?.toISOString?.() || '')}
                </Text>
              </View>
            </View>
          </View>

          {memberInfo.linkedAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="link" size={20} color="#6c757d" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Cuenta vinculada</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(memberInfo.linkedAt?.toDate?.()?.toISOString?.() || '')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Botón de Cerrar Sesión */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
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
  },
  header: {
    backgroundColor: '#007bff',
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  gymName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 30,
  },
});