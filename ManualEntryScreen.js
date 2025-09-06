import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase_config';

const ManualEntryScreen = ({ navigation }) => {
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
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

    const sendToFirestore = async () => {
        const finalJustification = justification === 'Outro (especificar)' ? customJustification : justification;
        if (justification === 'Outro (especificar)' && !customJustification) {
            Alert.alert("Erro", "Por favor, especifique a outra justificativa.");
            return;
        }

        try {
            const pontosCollection = collection(db, 'pontos');
            
            // Usamos os objetos Date diretamente, sem conversões complexas
            let workdayDate = new Date(date);
            if (time.getHours() >= 0 && time.getHours() < 6) {
                workdayDate.setDate(workdayDate.getDate() - 1);
            }

            // Unir a data e a hora para o timestamp final
            const pointDateTime = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                time.getHours(),
                time.getMinutes()
            );

            await addDoc(pontosCollection, {
                date: pointDateTime.toLocaleDateString('pt-BR'),
                time: pointDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                justificativa: finalJustification,
                timestamp_salvo: new Date().toISOString(),
                timestamp_ponto: pointDateTime.toISOString(),
                origem: 'manual',
                workday_date: workdayDate.toLocaleDateString('pt-BR'),
            });

            Alert.alert("Sucesso!", "Ponto registrado manualmente com sucesso!");
            setDate(new Date());
            setTime(new Date());
            setJustification('Inclusão manual');
            setCustomJustification('');
            navigation.navigate('CameraScreen');
        } catch (error) {
            console.error("Erro ao enviar dados para o Firestore:", error);
            Alert.alert("Erro", "Falha ao registrar o ponto. Verifique a conexão.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Registro Manual</Text>
                
                <Text style={styles.label}>Data</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.pickerButtonText}>{date.toLocaleDateString('pt-BR')}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                    <DateTimePicker
                        testID="datePicker"
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <Text style={styles.label}>Hora</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.pickerButtonText}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                    <DateTimePicker
                        testID="timePicker"
                        value={time}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onTimeChange}
                    />
                )}

                <Text style={styles.label}>Justificativa</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={justification}
                        onValueChange={(itemValue) => setJustification(itemValue)}
                    >
                        {justificationOptions.map((item, index) => (
                            <Picker.Item key={index} label={item} value={item} />
                        ))}
                    </Picker>
                </View>
                
                {justification === 'Outro (especificar)' && (
                    <TextInput
                        style={styles.input}
                        value={customJustification}
                        onChangeText={setCustomJustification}
                        placeholder="Descreva a justificativa"
                    />
                )}

                <View style={styles.buttonContainer}>
                    <Button title="Registrar Ponto" onPress={sendToFirestore} />
                </View>
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
    buttonContainer: {
        marginTop: 20,
    }
});

export default ManualEntryScreen;