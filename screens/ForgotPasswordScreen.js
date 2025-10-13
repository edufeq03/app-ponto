// screens/ForgotPasswordScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase_config'; // Garanta que o path esteja correto
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            Alert.alert("Erro", "Por favor, insira seu e-mail.");
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                "E-mail Enviado!", 
                `Um link de redefinição de senha foi enviado para ${email}. Verifique sua caixa de entrada e spam.`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error("Erro ao redefinir senha:", error.code);
            let errorMessage = "Ocorreu um erro ao tentar redefinir a senha.";

            // Mapeamento de erros comuns do Firebase
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Nenhum usuário encontrado com este e-mail.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "O formato do e-mail é inválido.";
            }
            
            Alert.alert("Erro", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Esqueceu a Senha?</Text>
            <Text style={styles.subtitle}>
                Insira seu e-mail para receber um link de redefinição.
            </Text>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>E-mail</Text>
                <TextInput
                    style={styles.input}
                    onChangeText={setEmail}
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="seu.email@exemplo.com"
                />
            </View>

            <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handlePasswordReset}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Enviar Link de Redefinição</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={20} color="#007AFF" />
                <Text style={styles.backButtonText}>Voltar para o Login</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        elevation: 3,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
    },
    backButtonText: {
        color: '#007AFF',
        fontSize: 16,
        marginLeft: 5,
    },
});

export default ForgotPasswordScreen;