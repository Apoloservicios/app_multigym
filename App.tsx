// App.tsx - VERSIÓN COMPLETA PERO ESTABLE
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { 
  ActivityIndicator, 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Context con error boundary
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens principales
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RealisticDashboard } from './src/screens/main/RealisticDashboard';
import { ProfileScreen } from './src/screens/main/ProfileScreen';
import { AttendanceDetailScreen } from './src/screens/gym/AttendanceDetailScreen';
import { RoutinesScreen } from './src/screens/gym/RoutinesScreen';

// Types
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  AttendanceDetail: undefined;
  RoutineDetail: { routineId: string };
};

type MainTabParamList = {
  Inicio: undefined;
  Asistencias: undefined;
  Rutinas: undefined;
  Perfil: undefined;
  Configuración: undefined;
};

// Navegadores
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 🛡️ Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ App Error Boundary:', error);
    console.error('❌ Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.errorContainer}>
            <Ionicons name="warning" size={48} color="#dc3545" />
            <Text style={styles.errorTitle}>Error en la aplicación</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || 'Error desconocido'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: undefined })}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

// 🛡️ COMPONENTE WRAPPER PARA SAFE AREA
const SafeWrapper: React.FC<{ children: React.ReactNode; backgroundColor?: string }> = ({ 
  children, 
  backgroundColor = '#007bff' 
}) => {
  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={backgroundColor}
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// 💰 Pantalla de Pagos (simplificada para estabilidad)
const PaymentsScreen = () => {
  const { memberInfo, gymInfo } = useAuth();
  
  return (
    <SafeWrapper backgroundColor="#ffc107">
      <View style={styles.screenContainer}>
        <Text style={styles.title}>💳 Mis Pagos</Text>
        <Text style={styles.subtitle}>Historial y estado de cuenta</Text>
        
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Próximo Vencimiento</Text>
          <Text style={styles.paymentAmount}>
            ${memberInfo?.totalDebt?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.paymentDate}>Vence: 14/07/2025</Text>
          
          <TouchableOpacity 
            style={styles.payButton}
            onPress={() => Alert.alert('Pagos', 'Funcionalidad próximamente')}
          >
            <Text style={styles.payButtonText}>Ver Detalles</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.paymentHistory}>
          <Text style={styles.sectionTitle}>Historial de Pagos:</Text>
          
          {[
            { date: '14 jun 2025', amount: '$60.000', status: 'Pagado' },
            { date: '14 may 2025', amount: '$60.000', status: 'Pagado' },
            { date: '14 abr 2025', amount: '$60.000', status: 'Pagado' },
          ].map((payment, index) => (
            <View key={index} style={styles.paymentItem}>
              <View>
                <Text style={styles.paymentItemDate}>{payment.date}</Text>
                <Text style={styles.paymentItemAmount}>{payment.amount}</Text>
              </View>
              <Text style={styles.paymentItemStatus}>{payment.status}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeWrapper>
  );
};

// 🔔 Pantalla de Notificaciones
const NotificationsScreen = () => {
  return (
    <SafeWrapper backgroundColor="#17a2b8">
      <View style={styles.screenContainer}>
        <Text style={styles.title}>🔔 Notificaciones</Text>
        <Text style={styles.subtitle}>Recordatorios y avisos</Text>
        
        <View style={styles.notificationsList}>
          {[
            {
              icon: 'card-outline',
              title: 'Pago Próximo a Vencer',
              message: 'Tu cuota vence en 3 días',
              time: 'Hace 2 horas',
              type: 'warning'
            },
            {
              icon: 'fitness-outline',
              title: '¡Excelente Progreso!',
              message: 'Has completado 12 entrenamientos este mes',
              time: 'Ayer',
              type: 'success'
            },
            {
              icon: 'calendar-outline',
              title: 'Rutina Actualizada',
              message: 'Tu entrenador actualizó tu rutina',
              time: 'Hace 3 días',
              type: 'info'
            }
          ].map((notification, index) => (
            <View key={index} style={styles.notificationItem}>
              <View style={[
                styles.notificationIcon,
                { backgroundColor: notification.type === 'warning' ? '#ffc107' : 
                                   notification.type === 'success' ? '#28a745' : '#17a2b8' }
              ]}>
                <Ionicons name={notification.icon as any} size={20} color="#fff" />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </SafeWrapper>
  );
};

// ⚙️ Pantalla de Configuración
const SettingsScreen = () => {
  const { signOut, memberInfo } = useAuth();
  
  const handleSignOut = async () => {
    try {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que quieres cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Cerrar Sesión', 
            style: 'destructive', 
            onPress: () => signOut() 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar la sesión');
    }
  };
  
  return (
    <SafeWrapper backgroundColor="#495057">
      <View style={styles.screenContainer}>
        <Text style={styles.title}>⚙️ Configuración</Text>
        
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Perfil', 'Funcionalidad próximamente')}
          >
            <Ionicons name="person-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Contraseña', 'Funcionalidad próximamente')}
          >
            <Ionicons name="key-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Cambiar Contraseña</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferencias</Text>
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Notificaciones', 'Funcionalidad próximamente')}
          >
            <Ionicons name="notifications-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Notificaciones</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Tema', 'Funcionalidad próximamente')}
          >
            <Ionicons name="moon-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Tema Oscuro</Text>
            <View style={styles.toggle}>
              <Text style={styles.toggleText}>Desactivado</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingOption}>
            <Ionicons name="language-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Idioma</Text>
            <Text style={styles.settingValue}>Español</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Ayuda', 'Contacta al gimnasio para soporte')}
          >
            <Ionicons name="help-circle-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Centro de Ayuda</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={() => Alert.alert('Soporte', 'Contacta al gimnasio directamente')}
          >
            <Ionicons name="mail-outline" size={24} color="#007bff" />
            <Text style={styles.settingText}>Contactar Soporte</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>GymApp v1.0.0</Text>
          <Text style={styles.appBuild}>Build: {memberInfo?.id?.substring(0, 8) || 'xxxxxxxx'}</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeWrapper>
  );
};

// 👤 Pantalla de Perfil Mejorada
const ProfileScreenEnhanced = () => {
  const { user, memberInfo, gymInfo } = useAuth();
  
  return (
    <SafeWrapper backgroundColor="#6c757d">
      <View style={styles.screenContainer}>
        <Text style={styles.title}>👤 Mi Perfil</Text>
        
        {memberInfo ? (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>
                {memberInfo.firstName?.charAt(0)}{memberInfo.lastName?.charAt(0)}
              </Text>
            </View>
            
            <Text style={styles.profileName}>
              {memberInfo.firstName} {memberInfo.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {gymInfo && (
              <Text style={styles.profileGym}>🏢 {gymInfo.name}</Text>
            )}
          </View>
        ) : (
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>Cargando perfil...</Text>
          </View>
        )}
        
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatNumber}>127</Text>
            <Text style={styles.profileStatLabel}>Entrenamientos</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatNumber}>15</Text>
            <Text style={styles.profileStatLabel}>Este mes</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatNumber}>8</Text>
            <Text style={styles.profileStatLabel}>Meses activo</Text>
          </View>
        </View>
        
        <View style={styles.membershipInfo}>
          <Text style={styles.sectionTitle}>Estado de Membresía:</Text>
          <View style={styles.membershipStatus}>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusActive}>✅ Membresía Activa</Text>
            </View>
            <Text style={styles.statusDate}>Vence: 31/12/2025</Text>
            <Text style={styles.statusDays}>185 días restantes</Text>
          </View>
        </View>
        
        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={styles.profileAction}
            onPress={() => Alert.alert('Editar', 'Funcionalidad próximamente')}
          >
            <Ionicons name="create-outline" size={20} color="#007bff" />
            <Text style={styles.profileActionText}>Editar Perfil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileAction}
            onPress={() => Alert.alert('Compartir', 'Funcionalidad próximamente')}
          >
            <Ionicons name="share-outline" size={20} color="#007bff" />
            <Text style={styles.profileActionText}>Compartir Logros</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeWrapper>
  );
};

// Navegador de Tabs Principal - CON 5 TABS
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Asistencias') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Rutinas') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Configuración') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: '#6c757d',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Inicio" component={RealisticDashboard} />
      <Tab.Screen name="Asistencias" component={AttendanceDetailScreen} />
      <Tab.Screen name="Rutinas" component={RoutinesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreenEnhanced} />
      <Tab.Screen name="Configuración" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Navegador de autenticación con manejo de errores
const AuthNavigator = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <SafeWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Cargando GymApp...</Text>
        </View>
      </SafeWrapper>
    );
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

// Componente principal de la App con Error Boundary
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <AuthNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// 🎨 ESTILOS COMPLETOS (manteniendo todos los originales)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  
  // Payment styles
  paymentCard: {
    backgroundColor: '#ffffff',
    padding: 25,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 10,
  },
  paymentAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 5,
  },
  paymentDate: {
    fontSize: 14,
    color: '#dc3545',
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentHistory: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  paymentItemDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  paymentItemAmount: {
    fontSize: 14,
    color: '#6c757d',
  },
  paymentItemStatus: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  
  // Notifications styles
  notificationsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  
  // Profile styles
  profileCard: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 5,
  },
  profileGym: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
  profileActions: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  profileActionText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Membership info
  membershipInfo: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  membershipStatus: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 8,
  },
  statusActive: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  statusDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  statusDays: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  
  // Settings styles
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    marginLeft: 15,
  },
  settingValue: {
    fontSize: 14,
    color: '#6c757d',
    marginRight: 10,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 15,
  },
  toggleText: {
    fontSize: 12,
    color: '#6c757d',
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appVersion: {
    fontSize: 14,
    color: '#6c757d',
  },
  appBuild: {
    fontSize: 12,
    color: '#9ca3af',
  },
  
  // Common styles
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 15,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  });