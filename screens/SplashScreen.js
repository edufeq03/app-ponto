// screens/SplashScreen.js

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
// Se você tiver uma imagem de logo, use-a aqui. 
// Ex: import LogoImage from '../assets/logo.png'; 

const SplashScreen = () => {
    // Você pode usar o componente Image aqui se tiver um logo
    const AppLogo = () => (
        // Exemplo: Coloque a sua tag Image aqui, ou use o Text como placeholder
        <Text style={styles.logoText}>Meu Ponto!</Text>
    );

    return (
        <View style={styles.container}>
            <AppLogo />
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            <Text style={styles.subtitle}>Carregando aplicação...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff', // Cor de fundo da sua splash
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#007AFF', 
        marginBottom: 20,
    },
    logo: {
        width: 200, // Ajuste o tamanho do seu logo
        height: 200,
        marginBottom: 30,
        // Adicione resizeMode, se necessário
    },
    subtitle: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    spinner: {
        marginTop: 20,
    }
});

export default SplashScreen;