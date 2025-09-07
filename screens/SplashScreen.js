import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';

const SplashScreen = ({ navigation }) => {
    useEffect(() => {
        const checkCameraPermission = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status === 'granted') {
                navigation.replace('CameraScreen');
            } else {
                // Navega para uma tela de erro ou permanece aqui com uma mensagem
                // Para este exemplo, vamos navegar para a tela da câmera
                // e deixar que ela mostre a mensagem de erro
                navigation.replace('CameraScreen'); 
            }
        };
        checkCameraPermission();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ponto Certo</Text>
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            <Text style={styles.subtitle}>Verificando permissões...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
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