import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase_config';
import { SafeAreaView } from 'react-native-safe-area-context';

const SignUpScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignUp = async () => {
        // Validação de e-mail e senha
        if (!email || !email.includes('@')) {
            Alert.alert("Erro", "Por favor, insira um endereço de e-mail válido.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Erro", "A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('Usuário cadastrado com sucesso!');
            // A navegação agora é gerenciada pelo App.js no listener onAuthStateChanged
        } catch (error) {
            console.error('Erro no cadastro:', error);
            let errorMessage = "Ocorreu um erro ao criar a conta.";
            if (error.code === 'auth/invalid-email') {
                errorMessage = "O e-mail inserido é inválido.";
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.";
            }
            Alert.alert("Erro", errorMessage);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Criar uma Conta</Text>
            <TextInput
                style={styles.input}
                placeholder="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Senha (mínimo 6 caracteres)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Já tem uma conta? Faça login</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    buttonContainer: {
        marginTop: 10,
    },
    linkText: {
        marginTop: 20,
        color: '#007AFF',
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default SignUpScreen;