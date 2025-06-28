// src/screens/auth/LoginScreen.tsx
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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { GymLinkingScreen } from './GymLinkingScreen';
import { LoginHelper } from '../../components/LoginHelper';

export const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // Email o teléfono
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const { signIn } = useAuth();

  // Función para detectar si es email o teléfono
  const formatIdentifierForAuth = (input: string): string => {
    const trimmed = input.trim();
    
    // Si contiene @ es email
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }
    
    // Si es solo números, tratarlo como teléfono
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed}@gymapp.local`;
    }
    
    // Si no, tratarlo como email
    return trimmed.toLowerCase();
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      // Convertir identifier a formato de email para Firebase
      const emailForAuth = formatIdentifierForAuth(identifier);
      console.log('🔐 Intentando login con:', emailForAuth);
      
      await signIn(emailForAuth, password);
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      
      // Mensajes de error más amigables
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.message.includes('user-not-found')) {
        errorMessage = 'No se encontró una cuenta con estos datos. ¿Ya te registraste?';
      } else if (error.message.includes('wrong-password')) {
        errorMessage = 'Contraseña incorrecta. Inténtalo de nuevo.';
      } else if (error.message.includes('invalid-credential')) {
        errorMessage = 'Email/teléfono o contraseña incorrectos.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExamplePress = (example: string) => {
    setIdentifier(example);
    setShowHelper(false);
  };

  const handleLinkSuccess = () => {
    setShowRegister(false);
    setShowHelper(true); // Mostrar ayuda después del registro
    Alert.alert(
      '✅ Cuenta creada exitosamente', 
      'Ya puedes iniciar sesión. Ve los ejemplos de abajo para ayudarte.',
      [{ text: 'Entendido' }]
    );
  };

  if (showRegister) {
    return (
      <GymLinkingScreen
        onLinkSuccess={handleLinkSuccess}
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>🏋️ GymApp</Text>
      <Text style={styles.subtitle}>Bienvenido de vuelta</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email o Teléfono"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => setShowHelper(!showHelper)}
          >
            <Text style={styles.helpButtonText}>
              {showHelper ? 'Ocultar ayuda' : '💡 ¿Cómo iniciar sesión?'}
            </Text>
          </TouchableOpacity>
        </View>

        {showHelper && (
          <LoginHelper onExamplePress={handleExamplePress} />
        )}

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => setShowRegister(true)}
        >
          <Text style={styles.registerButtonText}>
            ¿No tienes cuenta? Únete a tu gimnasio →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  form: {
    gap: 15,
  },
  inputContainer: {
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  helpButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  helpButtonText: {
    color: '#007bff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#007bff',
    fontSize: 14,
    textAlign: 'center',
  },
});