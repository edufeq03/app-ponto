import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase_config'; // Importa o serviço de autenticação

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("Login bem-sucedido!");
        } catch (error) {
            console.error("Erro no login:", error.message);
            Alert.alert("Erro no Login", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("Cadastro bem-sucedido!");
        } catch (error) {
            console.error("Erro no cadastro:", error.message);
            Alert.alert("Erro no Cadastro", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Ponto Digital</Text>
            <View style={styles.card}>
                <Text style={styles.title}>Acessar</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
                ) : (
                    <View style={styles.buttonGroup}>
                        <Button title="Login" onPress={handleSignIn} />
                        <Button title="Cadastre-se" onPress={handleSignUp} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        color: '#333',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    buttonGroup: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    spinner: {
        marginTop: 20,
    },
});

export default LoginScreen;