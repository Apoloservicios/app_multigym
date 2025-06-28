// src/screens/auth/GymLinkingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gymService, GymInfo } from '../../services/firebase/gymService';

interface GymLinkingScreenProps {
  onLinkSuccess: () => void;
  onBackToLogin: () => void;
}

export const GymLinkingScreen: React.FC<GymLinkingScreenProps> = ({ 
  onLinkSuccess, 
  onBackToLogin 
}) => {
  const [step, setStep] = useState<'search' | 'member' | 'verify'>('search');
  const [loading, setLoading] = useState(false);
  
  // Step 1: Buscar gimnasio
  const [searchQuery, setSearchQuery] = useState('');
  const [gymOptions, setGymOptions] = useState<GymInfo[]>([]);
  const [selectedGym, setSelectedGym] = useState<GymInfo | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // Step 2: Datos del miembro
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Step 3: Crear contraseña
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSearchGyms = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del gimnasio');
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
    
    try {
      console.log('🔍 Buscando gimnasios reales con:', searchQuery);
      
      // Buscar gimnasios reales en Firebase
      const realGyms = await gymService.searchGymsByName(searchQuery);
      
      console.log(`✅ Encontrados ${realGyms.length} gimnasios`);
      setGymOptions(realGyms);
      
      if (realGyms.length === 0) {
        Alert.alert(
          'Sin resultados', 
          `No se encontraron gimnasios con "${searchQuery}".\n\nPrueba con:\n• Solo el nombre principal\n• Sin acentos\n• Nombre del propietario`
        );
      }
      
    } catch (error: any) {
      console.error('❌ Error buscando gimnasios:', error);
      Alert.alert('Error', 'Error al buscar gimnasios. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGym = (gym: GymInfo) => {
    setSelectedGym(gym);
    setStep('member');
  };

  const handleVerifyMember = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'El número de teléfono es obligatorio');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'El nombre y apellido son obligatorios');
      return;
    }

    if (!selectedGym) {
      Alert.alert('Error', 'No se ha seleccionado un gimnasio');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verificando miembro en:', selectedGym.name);
      
      // Buscar miembro real en Firebase
      const memberData = await gymService.findMemberInGym(
        selectedGym.id,
        phone.trim(),
        firstName.trim(),
        lastName.trim(),
        email.trim() || undefined
      );
      
      if (memberData) {
        console.log('✅ Miembro verificado:', memberData.firstName, memberData.lastName);
        
        // Verificar si ya tiene cuenta vinculada
        if (memberData.userId) {
          Alert.alert(
            'Cuenta existente',
            'Este miembro ya tiene una cuenta vinculada. Intenta iniciar sesión o contacta al gimnasio.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setStep('verify');
      } else {
        Alert.alert(
          'Miembro no encontrado', 
          `No se encontró un miembro con estos datos en ${selectedGym.name}.\n\n` +
          'Verifica que:\n' +
          '• El teléfono sea exactamente como está registrado\n' +
          '• El nombre y apellido sean exactos\n' +
          '• Estés buscando en el gimnasio correcto\n\n' +
          'Si los datos son correctos, contacta al gimnasio para verificar tu registro.'
        );
      }
      
    } catch (error: any) {
      console.error('❌ Error verificando miembro:', error);
      Alert.alert('Error', 'Error al verificar información: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!password.trim() || password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!selectedGym) {
      Alert.alert('Error', 'Error interno: gimnasio no seleccionado');
      return;
    }

    setLoading(true);
    try {
      console.log('🔗 Creando cuenta para miembro...');
      
      // Buscar datos completos del miembro
      const memberData = await gymService.findMemberInGym(
        selectedGym.id,
        phone.trim(),
        firstName.trim(),
        lastName.trim(),
        email.trim() || undefined
      );
      
      if (!memberData) {
        Alert.alert('Error', 'No se pudo encontrar la información del miembro');
        return;
      }
      
      // Crear cuenta y vincular
      await gymService.linkMemberAccount(memberData, password);
      
      Alert.alert(
        '¡Cuenta creada exitosamente!', 
        `Tu cuenta ha sido vinculada con ${selectedGym.name}.\n\nYa puedes iniciar sesión con tu nueva contraseña.`,
        [{ text: 'Continuar', onPress: onLinkSuccess }]
      );
      
    } catch (error: any) {
      console.error('❌ Error creando cuenta:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="search" size={32} color="#007bff" />
        <Text style={styles.stepTitle}>Busca tu Gimnasio</Text>
        <Text style={styles.stepSubtitle}>
          Ingresa el nombre del gimnasio donde eres miembro
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Ej: Cerros, Fitness, Power..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.buttonDisabled]}
          onPress={handleSearchGyms}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {searchPerformed && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {gymOptions.length > 0 ? 'Gimnasios encontrados:' : 'No se encontraron gimnasios'}
          </Text>
          
          {gymOptions.length > 0 ? (
            <FlatList
              data={gymOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.gymOption}
                  onPress={() => handleSelectGym(item)}
                >
                  <View style={styles.gymInfo}>
                    <Text style={styles.gymName}>{item.name}</Text>
                    <Text style={styles.gymAddress}>📍 {item.address}</Text>
                    <Text style={styles.gymOwner}>👤 {item.owner}</Text>
                    <Text style={styles.gymPhone}>📞 {item.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#007bff" />
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          ) : searchPerformed && !loading ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                No se encontraron gimnasios con ese nombre.
              </Text>
              <Text style={styles.noResultsSubtext}>
                Prueba con palabras clave diferentes o contacta al gimnasio.
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  const renderMemberStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.selectedGymCard}>
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <View style={styles.selectedGymInfo}>
            <Text style={styles.selectedGymName}>{selectedGym?.name}</Text>
            <Text style={styles.selectedGymAddress}>{selectedGym?.address}</Text>
          </View>
        </View>
        <Text style={styles.stepTitle}>Verifica tu Membresía</Text>
        <Text style={styles.stepSubtitle}>
          Ingresa tus datos tal como están registrados en el gimnasio
        </Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>📱 Teléfono (Obligatorio)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 2604031110"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={15}
        />
        <Text style={styles.inputHint}>
          Usa el número registrado en el gimnasio
        </Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>👤 Nombre y Apellido</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Apellido"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>📧 Email (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Si lo tienes registrado"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyMember}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verificar Membresía</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('search')}
      >
        <Text style={styles.backButtonText}>← Cambiar Gimnasio</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="shield-checkmark" size={32} color="#28a745" />
        <Text style={styles.stepTitle}>¡Membresía Verificada!</Text>
        <Text style={styles.stepSubtitle}>
          Crea tu contraseña para acceder a la app
        </Text>
      </View>

      <View style={styles.verifiedInfo}>
        <Text style={styles.verifiedText}>✅ Gimnasio: {selectedGym?.name}</Text>
        <Text style={styles.verifiedText}>✅ Teléfono: {phone}</Text>
        <Text style={styles.verifiedText}>✅ Nombre: {firstName} {lastName}</Text>
        {email && <Text style={styles.verifiedText}>✅ Email: {email}</Text>}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nueva contraseña (mínimo 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreateAccount}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Crear Mi Cuenta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('member')}
      >
        <Text style={styles.backButtonText}>← Corregir Información</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏋️ Únete a tu Gimnasio</Text>
        <Text style={styles.subtitle}>
          Conecta con tu membresía existente
        </Text>
      </View>

      {step === 'search' && renderSearchStep()}
      {step === 'member' && renderMemberStep()}
      {step === 'verify' && renderVerifyStep()}

      <TouchableOpacity style={styles.loginLink} onPress={onBackToLogin}>
        <Text style={styles.loginLinkText}>
          ¿Ya tienes cuenta? Iniciar Sesión
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  stepContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 10,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
  },
  gymOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  gymAddress: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  gymOwner: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  gymPhone: {
    fontSize: 14,
    color: '#007bff',
  },
  noResults: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  selectedGymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  selectedGymInfo: {
    marginLeft: 10,
  },
  selectedGymName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  selectedGymAddress: {
    fontSize: 14,
    color: '#6c757d',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 14,
  },
  verifiedInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  verifiedText: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
  },
  loginLink: {
    margin: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#007bff',
    fontSize: 16,
  },
});