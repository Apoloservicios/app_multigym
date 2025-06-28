// src/components/LoginHelper.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoginHelperProps {
  onExamplePress: (example: string) => void;
}

export const LoginHelper: React.FC<LoginHelperProps> = ({ onExamplePress }) => {
  const examples = [
    {
      icon: 'mail' as const,
      title: 'Con Email',
      example: 'carola@gmail.com',
      description: 'Si proporcionaste email al registrarte'
    },
    {
      icon: 'call' as const,
      title: 'Con Teléfono',
      example: '2604625617',
      description: 'Tu número registrado en el gimnasio'
    },
    {
      icon: 'at' as const,
      title: 'Formato Completo',
      example: '2604625617@gymapp.local',
      description: 'Si prefieres el formato completo'
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Formas de iniciar sesión</Text>
      
      {examples.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.exampleCard}
          onPress={() => onExamplePress(item.example)}
        >
          <View style={styles.exampleHeader}>
            <Ionicons name={item.icon} size={20} color="#007bff" />
            <Text style={styles.exampleTitle}>{item.title}</Text>
          </View>
          
          <Text style={styles.exampleText}>{item.example}</Text>
          <Text style={styles.exampleDescription}>{item.description}</Text>
          
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Toca para usar este ejemplo</Text>
          </View>
        </TouchableOpacity>
      ))}
      
      <View style={styles.note}>
        <Ionicons name="information-circle" size={16} color="#6c757d" />
        <Text style={styles.noteText}>
          La contraseña es la que elegiste durante el registro
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 15,
    textAlign: 'center',
  },
  exampleCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginLeft: 8,
  },
  exampleText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#212529',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  exampleDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  tapHint: {
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    color: '#007bff',
    fontStyle: 'italic',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e7f3ff',
    borderRadius: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 6,
    flex: 1,
  },
});