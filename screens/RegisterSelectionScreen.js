import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Assumindo que você usa MaterialIcons

export default function RegisterSelectionScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Registrar Ponto</Text>
            <View style={styles.buttonContainer}>
                {/* Botão para a Câmera */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Tirar Foto')}
                >
                    <Icon name="camera-alt" size={50} color="#007AFF" />
                    <Text style={styles.buttonText}>Tirar Foto</Text>
                </TouchableOpacity>

                {/* Botão para o Registro Manual */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('ManualEntry')}
                >
                    <Icon name="edit" size={50} color="#4CAF50" />
                    <Text style={styles.buttonText}>Registro Manual</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 50,
        color: '#333',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    button: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '45%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        textAlign: 'center',
    },
});