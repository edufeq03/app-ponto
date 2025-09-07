import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase_config';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        // Validação de e-mail
        if (!email || !email.includes('@')) {
            Alert.alert("Erro", "Por favor, insira um endereço de e-mail válido.");
            return;
        }

        if (!password) {
            Alert.alert("Erro", "Por favor, insira sua senha.");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Usuário logado com sucesso!');
            // A navegação agora é gerenciada pelo App.js no listener onAuthStateChanged
        } catch (error) {
            console.error('Erro no login:', error);
            let errorMessage = "Ocorreu um erro no login. Verifique seu e-mail e senha.";
            if (error.code === 'auth/invalid-email') {
                errorMessage = "O e-mail inserido é inválido.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "E-mail ou senha incorretos.";
            }
            Alert.alert("Erro", errorMessage);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Bem-vindo!</Text>
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
                placeholder="Senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <View style={styles.buttonContainer}>
                <Button title="Entrar" onPress={handleLogin} />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.linkText}>Não tem uma conta? Cadastre-se</Text>
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
});

export default LoginScreen;