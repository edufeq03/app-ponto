import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const RegisterSelectionScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Ponto</Text>
      <Text style={styles.subtitle}>Escolha uma opção para registrar seu ponto.</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate('Entrada Manual')}
      >
        <Text style={styles.buttonText}>Entrada Manual</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate('Ponto por Foto')}
      >
        <Text style={styles.buttonText}>Ponto por Foto</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '80%',
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RegisterSelectionScreen;