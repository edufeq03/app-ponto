import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdBannerPlaceholder = () => {
  return (
    <View style={styles.adContainer}>
      <Text style={styles.adText}>Espaço reservado para Anúncio</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  adContainer: {
    height: 50, // Altura padrão de um banner
    width: '100%',
    backgroundColor: '#e0e0e0', // Cor para simular o banner
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto', // Empurra para a parte inferior da tela
  },
  adText: {
    fontSize: 12,
    color: '#616161',
  },
});

export default AdBannerPlaceholder;