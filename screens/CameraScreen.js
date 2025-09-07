// screens/CameraScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../config/firebase_config';
import { processImage, checkIfDuplicate, savePointData, findMostFrequentName } from '../services/cameraService.js';
import styles from './CameraScreenStyles';

export default function CameraScreen({ navigation }) {
    const [cameraModalVisible, setCameraModalVisible] = useState(false);
    const [validationModalVisible, setValidationModalVisible] = useState(false);
    const [extractedData, setExtractedData] = useState({});
    const [originalExtractedData, setOriginalExtractedData] = useState({});
    const [originalText, setOriginalText] = useState('');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [processing, setProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [justificationModalVisible, setJustificationModalVisible] = useState(false);
    const [justification, setJustification] = useState('');

    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedJustification, setSelectedJustification] = useState('Leitura incorreta do OCR');
    const [customJustification, setCustomJustification] = useState('');

    const [mostFrequentName, setMostFrequentName] = useState(null);
    const [isLoadingUserNames, setIsLoadingUserNames] = useState(true);

    const justificationOptions = [
        'Leitura incorreta do OCR',
        'Nome de usuário diferente do registrado',
        'Comprovante em nome de outro funcionário',
        'Outro (especificar)'
    ];
    
    // Agora o useEffect busca o nome mais frequente
    useEffect(() => {
        const fetchMostFrequentName = async () => {
            const user = auth.currentUser;
            if (user) {
                const name = await findMostFrequentName(user.uid);
                setMostFrequentName(name);
            }
            setIsLoadingUserNames(false);
        };
        fetchMostFrequentName();
    }, []);

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
        setExtractedData(prev => ({ ...prev, date: currentDate.toLocaleDateString('pt-BR') }));
    };

    const onTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || time;
        setShowTimePicker(Platform.OS === 'ios');
        setTime(currentTime);
        setExtractedData(prev => ({ ...prev, time: currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }));
    };

    async function handleConfirmData() {
        setIsSaving(true);
        try {
            const finalData = { ...extractedData };
            const justificationText = selectedJustification === 'Outro (especificar)' ? customJustification : selectedJustification;

            if (!finalData.date || !finalData.time) {
                Alert.alert("Erro", "Data ou hora não foram extraídas corretamente. Por favor, tente novamente ou insira manualmente.");
                setValidationModalVisible(false);
                return;
            }

            if (finalData.date !== originalExtractedData.date || finalData.time !== originalExtractedData.time) {
                finalData.editado = true;
                finalData.data_original_ocr = originalExtractedData.date;
                finalData.hora_original_ocr = originalExtractedData.time;
            } else {
                finalData.editado = false;
            }

            const isDuplicate = await checkIfDuplicate(finalData);
            if (isDuplicate) {
                Alert.alert("Aviso", "Este comprovante já foi registrado!");
                setValidationModalVisible(false);
                setIsSaving(false);
                return;
            }
            
            // Nova lógica de validação de nome
            const normalizedOcrName = finalData.name ? finalData.name.trim().toUpperCase() : '';
            const normalizedMostFrequentName = mostFrequentName ? mostFrequentName.trim().toUpperCase() : null;

            if (normalizedMostFrequentName && normalizedMostFrequentName !== normalizedOcrName) {
                Alert.alert(
                    "Aviso de Nome Diferente",
                    `O nome extraído do comprovante (${finalData.name}) não corresponde ao seu nome de referência (${mostFrequentName}). Por favor, justifique a diferença.`,
                    [
                        { text: "Cancelar", style: "cancel", onPress: () => {
                            setIsSaving(false);
                            setValidationModalVisible(false);
                        }},
                        { text: "Justificar", onPress: () => {
                            setIsSaving(false);
                            setValidationModalVisible(false);
                            setJustificationModalVisible(true);
                        }}
                    ]
                );
                return;
            }
            
            await savePointAndImage(finalData, justificationText);
        } finally {
            setIsSaving(false);
        }
    }

    const savePointAndImage = async (data, justification = null) => {
        setIsSaving(true);
        try {
            const success = await savePointData(data.photoUri, { ...data, justification_ocr: justification });
            if (success) {
                Alert.alert("Sucesso!", "Dados enviados com sucesso para o banco de dados.");
            } else {
                Alert.alert("Erro", "Falha ao enviar os dados. Verifique a conexão.");
            }
        } finally {
            setIsSaving(false);
            setJustificationModalVisible(false);
            setValidationModalVisible(false);
            // Recalcula o nome mais frequente após salvar um novo registro
            const user = auth.currentUser;
            if (user) {
                const name = await findMostFrequentName(user.uid);
                setMostFrequentName(name);
            }
        }
    };

    async function handleOpenCamera() {
        try {
            if (!permission.granted) {
                const permissionResult = await requestPermission();
                if (!permissionResult.granted) {
                    Alert.alert("Câmera", "Você precisa habilitar o uso da câmera");
                    return;
                }
            }
            setCameraModalVisible(true);
        } catch (error) {
            console.log(error);
        }
    }

    async function handleTakePhoto() {
        if (cameraRef.current) {
            setProcessing(true);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
                mute: true,
            });
            setCameraModalVisible(false);
            
            const { originalText: detectedText, extractedData: extracted } = await processImage(photo.uri);

            setExtractedData({ ...extracted, photoUri: photo.uri });
            setOriginalExtractedData(extracted);
            setOriginalText(detectedText);
            setDate(new Date()); 
            setTime(new Date());
            setProcessing(false);
            setValidationModalVisible(true);
        }
    }

    if (isLoadingUserNames) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Calibrando nome do usuário...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainButtonsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleOpenCamera}>
                    <Text style={styles.actionButtonText}>Tirar foto do comprovante</Text>
                </TouchableOpacity>
                <Text style={styles.infoText}>Use o menu abaixo para navegar entre as telas.</Text>
            </View>
            <Modal visible={cameraModalVisible} style={{ flex: 1 }}>
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    ref={cameraRef}
                />
                <View style={styles.cameraFrameContainer}>
                    <View style={styles.horizontalFrame} />
                </View>
                <View style={styles.cameraControls}>
                    <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                        <View style={styles.captureButtonOuter}>
                            <View style={styles.captureButtonInner}></View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraModalVisible(false)}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
            
            <Modal visible={validationModalVisible} animationType="slide" style={{ flex: 1 }}>
                <SafeAreaView style={styles.modalContainer}>
                    <ScrollView style={styles.scrollView}>
                        <Text style={styles.modalHeader}>Confirme os Dados</Text>
                        <Text style={styles.modalSubtitle}>Dados extraídos da imagem. Por favor, corrija se necessário.</Text>
                        
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Nome:</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: '#e0e0e0' }]}
                                value={extractedData.name}
                                editable={false}
                            />
                        </View>
                        
                        <Text style={styles.formLabel}>Data:</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
                            <Text style={styles.pickerButtonText}>{extractedData.date || 'Selecione a Data'}</Text>
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

                        <Text style={styles.formLabel}>Hora:</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.pickerButton}>
                            <Text style={styles.pickerButtonText}>{extractedData.time || 'Selecione a Hora'}</Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker
                                testID="timePicker"
                                value={time}
                                mode="time"
                                display="default"
                                onChange={onTimeChange}
                            />
                        )}

                        <Text style={styles.formLabel}>Justificativa:</Text>
                        <View style={styles.input}>
                            <Picker
                                selectedValue={selectedJustification}
                                onValueChange={(itemValue) => setSelectedJustification(itemValue)}
                            >
                                {justificationOptions.map((option, index) => (
                                    <Picker.Item key={index} label={option} value={option} />
                                ))}
                            </Picker>
                        </View>

                        {selectedJustification === 'Outro (especificar)' && (
                            <TextInput
                                style={styles.input}
                                value={customJustification}
                                onChangeText={setCustomJustification}
                                placeholder="Descreva a justificativa"
                            />
                        )}

                        <Text style={styles.originalTextLabel}>Texto original do comprovante:</Text>
                        <Text style={styles.originalText}>{originalText}</Text>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <Button
                            title={isSaving ? "Salvando..." : "Confirmar"}
                            onPress={handleConfirmData}
                            disabled={isSaving}
                        />
                        <Button
                            title="Cancelar"
                            onPress={() => setValidationModalVisible(false)}
                        />
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal visible={justificationModalVisible} animationType="slide" transparent={true}>
                <View style={styles.justificationModalContainer}>
                    <View style={styles.justificationModalContent}>
                        <Text style={styles.justificationHeader}>Justifique a Diferença no Nome</Text>
                        <Text style={styles.justificationMessage}>O nome extraído não corresponde ao seu nome de referência. Por favor, explique a razão da diferença.</Text>
                        <TextInput
                            style={styles.justificationInput}
                            onChangeText={setJustification}
                            value={justification}
                            multiline
                            placeholder="Ex: 'Comprovante em nome de outro funcionário', 'Erro de leitura do OCR', etc."
                        />
                        <View style={styles.justificationButtonContainer}>
                            <Button title="Cancelar" onPress={() => setJustificationModalVisible(false)} color="#666" />
                            <Button 
                                title="Confirmar" 
                                onPress={() => savePointAndImage(extractedData, justification)} 
                                disabled={isSaving || !justification} 
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            
            {processing && (
                <Modal transparent={true} animationType="fade">
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Processando imagem...</Text>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}