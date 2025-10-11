import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, Text, View, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';

// Funções utilitárias para formatação
const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR');
};

const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const ValidationModal = ({
    visible,
    data,
    originalText,
    onDataChange,
    onCancel,
    onSubmit,
}) => {
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [pickerMode, setPickerMode] = useState('date'); // 'date' ou 'time'
    const [currentField, setCurrentField] = useState(null); // 'date' ou 'time'

    // Tenta criar um objeto Date a partir dos dados (pode ser inválido se data/hora estiverem no formato texto)
    const initialDate = new Date();
    // Você pode tentar parsear a data e hora do OCR aqui, mas é mais seguro usar a data atual se a data for inválida
    // Exemplo simplificado:
    let selectedDateTime = initialDate;
    const [d, m, y] = (data.date || '').split('/');
    const [h, min] = (data.time || '').split(':');
    
    // Tenta montar a data a partir do OCR, se possível
    if (y && m && d && h && min) {
      const parsedDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min));
      if (!isNaN(parsedDate.getTime())) {
          selectedDateTime = parsedDate;
      }
    }


    const showPicker = (mode, field) => {
        setPickerMode(mode);
        setCurrentField(field);
        setDatePickerVisible(true);
    };

    const handleConfirm = (date) => {
        setDatePickerVisible(false);
        
        if (currentField === 'date') {
            // Se for data, atualiza o campo 'date' no estado pai
            onDataChange('date', formatDate(date));
            
            // Se o campo 'time' já tiver um valor, não o altere, apenas a data
            if (!data.time) {
                onDataChange('time', formatTime(date));
            }

        } else if (currentField === 'time') {
            // Se for hora, atualiza o campo 'time' no estado pai
            onDataChange('time', formatTime(date));
            
            // Se o campo 'date' já tiver um valor, não o altere, apenas a hora
            if (!data.date) {
                onDataChange('date', formatDate(date));
            }
        }
        setCurrentField(null);
    };

    const handleCancelPicker = () => {
        setDatePickerVisible(false);
        setCurrentField(null);
    };

    // Função para renderizar um campo de seleção padronizado
    const renderSelectField = (label, value, mode, fieldName) => (
        <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{label}</Text>
            <TouchableOpacity 
                style={styles.selectInput}
                onPress={() => showPicker(mode, fieldName)}
            >
                <Text style={styles.selectText}>
                    {value || (mode === 'date' ? 'Selecione a Data' : 'Selecione a Hora')}
                </Text>
                <Ionicons 
                    name={mode === 'date' ? 'calendar-outline' : 'time-outline'} 
                    size={24} 
                    color="#007AFF" 
                />
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.modalContainer}>
                <ScrollView>
                    <Text style={styles.modalHeader}>Validar Dados</Text>
                    <Text style={styles.modalSubtitle}>Revise e corrija os dados antes de salvar.</Text>                   
                    
                    {/* CAMPO DE SELEÇÃO DE DATA */}
                    {renderSelectField('Data (DD/MM/AAAA)', data.date, 'date', 'date')}

                    {/* CAMPO DE SELEÇÃO DE HORA */}
                    {renderSelectField('Hora (HH:MM)', data.time, 'time', 'time')}

                    <Text style={styles.originalTextLabel}>Texto Original Extraído da Imagem</Text>
                    <Text style={styles.originalText}>{originalText || 'Nenhum texto detectado.'}</Text>
                    
                    {/* BOTÕES PADRONIZADOS */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
                            <Ionicons name="close-circle-outline" size={24} color="#fff" />
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={onSubmit}>
                            <Ionicons name="save-outline" size={24} color="#fff" />
                            <Text style={styles.buttonText}>Salvar Ponto</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
            
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode={pickerMode}
                date={selectedDateTime} // Usa a data/hora atual ou a tentativa de parse
                onConfirm={handleConfirm}
                onCancel={handleCancelPicker}
                locale="pt_BR"
                headerTextIOS={pickerMode === 'date' ? 'Selecione a Data' : 'Selecione a Hora'}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    modalHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
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
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    // Estilo para o campo de seleção (substitui o TextInput de data/hora)
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    selectText: {
        fontSize: 16,
        color: '#333',
    },
    originalTextLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
        color: '#333',
    },
    originalText: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
        backgroundColor: '#eee',
        padding: 10,
        borderRadius: 5,
        borderLeftWidth: 3,
        borderLeftColor: '#ccc',
    },
    modalFooter: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    // Estilos dos novos botões
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        elevation: 3,
        width: '48%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    cancelButton: {
        backgroundColor: '#FF3B30', // Vermelho para cancelar
    },
    saveButton: {
        backgroundColor: '#007AFF', // Azul padrão para salvar
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});

export default ValidationModal;