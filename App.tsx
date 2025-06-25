// App.tsx - Con navegación profesional
import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';



// Types para navegación
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

type MainTabParamList = {
  Inicio: undefined;
  Perfil: undefined;
  Rutinas: undefined;
  Configuración: undefined;
};

// Navegadores
const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Context para autenticación
interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Provider de autenticación
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const FIREBASE_API_KEY = "AIzaSyCpGeAp5YcLiGAKI6GkVO13LVj_HNuunNU"; // <-- REEMPLAZA CON TU API KEY
  const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(FIREBASE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          returnSecureToken: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        let errorMessage = 'Error desconocido';
        if (data.error) {
          switch (data.error.message) {
            case 'EMAIL_NOT_FOUND':
              errorMessage = 'Usuario no encontrado';
              break;
            case 'INVALID_PASSWORD':
              errorMessage = 'Contraseña incorrecta';
              break;
            case 'USER_DISABLED':
              errorMessage = 'Usuario deshabilitado';
              break;
            default:
              errorMessage = data.error.message;
          }
        }
        throw new Error(errorMessage);
      }

      setUser(data);
      console.log('✅ Login exitoso:', data.email);
    } catch (error: any) {
      console.error('❌ Error login:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    console.log('🚪 Logout exitoso');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Pantalla de Login
const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('andresmartin2609@gmail.com');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Error de Login', error.message);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>🏋️ GymApp</Text>
      <Text style={styles.loginSubtitle}>Bienvenido de vuelta</Text>
      
      <View style={styles.loginForm}>
        <TextInput
          style={styles.loginInput}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TextInput
          style={styles.loginInput}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        
        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Pantalla de Inicio
const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>🏠 Inicio</Text>
      <Text style={styles.welcomeText}>¡Hola, {user?.email}!</Text>
      
      <View style={styles.dashboardGrid}>
        <View style={styles.dashboardCard}>
          <Ionicons name="fitness" size={40} color="#007bff" />
          <Text style={styles.cardTitle}>Rutinas</Text>
          <Text style={styles.cardSubtitle}>3 activas</Text>
        </View>
        
        <View style={styles.dashboardCard}>
          <Ionicons name="calendar" size={40} color="#28a745" />
          <Text style={styles.cardTitle}>Asistencias</Text>
          <Text style={styles.cardSubtitle}>15 este mes</Text>
        </View>
        
        <View style={styles.dashboardCard}>
          <Ionicons name="card" size={40} color="#ffc107" />
          <Text style={styles.cardTitle}>Membresía</Text>
          <Text style={styles.cardSubtitle}>Activa</Text>
        </View>
        
        <View style={styles.dashboardCard}>
          <Ionicons name="trophy" size={40} color="#dc3545" />
          <Text style={styles.cardTitle}>Logros</Text>
          <Text style={styles.cardSubtitle}>12 obtenidos</Text>
        </View>
      </View>
      
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <TouchableOpacity style={styles.quickActionButton}>
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.quickActionText}>Registrar Asistencia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Pantalla de Perfil
const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>👤 Mi Perfil</Text>
      
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={60} color="#fff" />
        </View>
        <Text style={styles.profileName}>Andrés Martín</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>
      
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.profileItem}>
          <Ionicons name="mail" size={20} color="#6c757d" />
          <Text style={styles.profileItemText}>{user?.email}</Text>
        </View>
        
        <View style={styles.profileItem}>
          <Ionicons name="card" size={20} color="#6c757d" />
          <Text style={styles.profileItemText}>Membresía Premium</Text>
        </View>
        
        <View style={styles.profileItem}>
          <Ionicons name="calendar" size={20} color="#6c757d" />
          <Text style={styles.profileItemText}>Miembro desde: Enero 2024</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out" size={20} color="white" />
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

// Pantalla de Rutinas
const RoutinesScreen: React.FC = () => {
  const routines = [
    { id: 1, name: 'Pecho y Tríceps', exercises: 8, duration: '45 min' },
    { id: 2, name: 'Espalda y Bíceps', exercises: 6, duration: '40 min' },
    { id: 3, name: 'Piernas', exercises: 10, duration: '60 min' },
  ];
  
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>💪 Mis Rutinas</Text>
      
      {routines.map(routine => (
        <View key={routine.id} style={styles.routineCard}>
          <View style={styles.routineHeader}>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </View>
          <View style={styles.routineDetails}>
            <Text style={styles.routineDetail}>
              <Ionicons name="fitness" size={16} color="#6c757d" /> {routine.exercises} ejercicios
            </Text>
            <Text style={styles.routineDetail}>
              <Ionicons name="time" size={16} color="#6c757d" /> {routine.duration}
            </Text>
          </View>
        </View>
      ))}
      
      <TouchableOpacity style={styles.addRoutineButton}>
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addRoutineText}>Nueva Rutina</Text>
      </TouchableOpacity>
    </View>
  );
};

// Pantalla de Configuración
const SettingsScreen: React.FC = () => {
  const { logout } = useAuth();
  
  const settingsOptions = [
    { icon: 'notifications', title: 'Notificaciones', subtitle: 'Gestionar alertas' },
    { icon: 'moon', title: 'Tema oscuro', subtitle: 'Cambiar apariencia' },
    { icon: 'shield-checkmark', title: 'Privacidad', subtitle: 'Configurar datos' },
    { icon: 'help-circle', title: 'Ayuda', subtitle: 'Soporte y FAQ' },
  ];
  
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>⚙️ Configuración</Text>
      
      {settingsOptions.map((option, index) => (
        <TouchableOpacity key={index} style={styles.settingItem}>
          <Ionicons name={option.icon as any} size={24} color="#007bff" />
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{option.title}</Text>
            <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6c757d" />
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={styles.dangerButton} onPress={logout}>
        <Ionicons name="log-out" size={20} color="#dc3545" />
        <Text style={styles.dangerButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

// Navegador de Tabs Principal
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Rutinas') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Configuración') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#007bff',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
      <Tab.Screen name="Rutinas" component={RoutinesScreen} />
      <Tab.Screen name="Configuración" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Componente principal de la App
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

// Navegador de autenticación
const AuthNavigator = () => {
  const { user } = useAuth();
  
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

// Importaciones necesarias que faltan
import {
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  loginTitle: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 10,
    color: '#212529',
  },
  loginSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 40,
  },
  loginForm: {
    gap: 15,
  },
  loginInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Screen Styles
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#212529',
  },
  welcomeText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 30,
  },

  // Dashboard Styles
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  dashboardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#212529',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },

  // Quick Actions
  quickActions: {
    marginTop: 'auto',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#212529',
  },
  quickActionButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Profile Styles
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
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
  },
  profileSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15,
  },
  profileItemText: {
    fontSize: 16,
    color: '#212529',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginTop: 'auto',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Routines Styles
  routineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
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
  },
  routineDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  routineDetail: {
    fontSize: 14,
    color: '#6c757d',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addRoutineButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginTop: 20,
  },
  addRoutineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Settings Styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    gap: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: 'bold',
  },
});