import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config'; // Importe 'auth'

const ManualEntryScreen = ({ navigation }) => {
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
    const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
    const [justification, setJustification] = useState('Inclusão manual');
    const [customJustification, setCustomJustification] = useState('');

    const justificationOptions = [
        'Inclusão manual',
        'Esquecimento',
        'Relógio inoperante',
        'Impressora sem papel',
        'Leitura incorreta do App',
        'Outro (especificar)'
    ];

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const onTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || time;
        setShowTimePicker(Platform.OS === 'ios');
        setTime(currentTime);
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    const showTimepicker = () => {
        setShowTimePicker(true);
    };

    const sendToFirestore = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado. Faça login para registrar o ponto.");
            return;
        }

        const pointTimestamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());

        const pointData = {
            timestamp_ponto: pointTimestamp.toISOString(),
            origem: 'manual',
            usuario_id: user.uid, // Salvando o UID do usuário
            justificativa: justification === 'Outro (especificar)' ? customJustification : justification,
            is_edited: false,
        };

        try {
            await addDoc(collection(db, 'pontos'), pointData);
            Alert.alert("Sucesso!", "Ponto manual registrado com sucesso.");
            navigation.goBack();
        } catch (error) {
            console.error("Erro ao adicionar documento: ", error);
            Alert.alert("Erro", "Não foi possível registrar o ponto manual.");
        }
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Registro Manual</Text>

                <Text style={styles.label}>Data:</Text>
                {Platform.OS === 'ios' ? (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                ) : (
                    <TouchableOpacity onPress={showDatepicker} style={styles.pickerButton}>
                        <Text style={styles.pickerButtonText}>{date.toLocaleDateString('pt-BR')}</Text>
                    </TouchableOpacity>
                )}
                {showDatePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <Text style={styles.label}>Hora:</Text>
                {Platform.OS === 'ios' ? (
                    <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                ) : (
                    <TouchableOpacity onPress={showTimepicker} style={styles.pickerButton}>
                        <Text style={styles.pickerButtonText}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                )}
                {showTimePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                        value={time}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}
                
                <Text style={styles.label}>Justificativa:</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={justification}
                        onValueChange={(itemValue) => setJustification(itemValue)}
                        style={styles.picker}
                    >
                        {justificationOptions.map((option, index) => (
                            <Picker.Item key={index} label={option} value={option} />
                        ))}
                    </Picker>
                </View>
                
                {justification === 'Outro (especificar)' && (
                    <TextInput
                        style={[styles.input, { height: 100 }]}
                        multiline
                        numberOfLines={4}
                        value={customJustification}
                        onChangeText={setCustomJustification}
                        placeholder="Descreva a justificativa"
                    />
                )}

                <TouchableOpacity
                    style={styles.registerButton}
                    onPress={sendToFirestore}
                >
                    <Text style={styles.registerButtonText}>Registrar Ponto</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
    },
    pickerButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        alignItems: 'center',
    },
    pickerButtonText: {
        fontSize: 16,
        color: '#000',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 15,
    },
    picker: {
        width: '100%',
    },
    registerButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
    },
    registerButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ManualEntryScreen;