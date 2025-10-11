import React from 'react';
import { Modal, SafeAreaView, ScrollView, Text, View, TextInput, Button, StyleSheet } from 'react-native';

const ValidationModal = ({
    visible,
    data,
    originalText,
    onDataChange,
    onCancel,
    onSubmit,
}) => {
    return (
        <Modal visible={visible} animationType="slide">
            <SafeAreaView style={styles.modalContainer}>
                <ScrollView>
                    <Text style={styles.modalHeader}>Validar Dados</Text>
                    <Text style={styles.modalSubtitle}>Revise e corrija os dados antes de salvar.</Text>                   
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Data (DD/MM/AAAA)</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => onDataChange('date', text)}
                            value={data.date}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Hora (HH:MM)</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={(text) => onDataChange('time', text)}
                            value={data.time}
                            keyboardType="numeric"
                        />
                    </View>

                    <Text style={styles.originalTextLabel}>Texto Original Extraído da Imagem:</Text>
                    <Text style={styles.originalText}>{originalText}</Text>

                    <View style={styles.modalFooter}>
                        <Button title="Cancelar" onPress={onCancel} color="#ff3b30" />
                        <Button title="Salvar Ponto" onPress={onSubmit} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

// Estilos movidos do CameraScreen para cá, adaptados para o modal
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
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 15,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    originalTextLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
    },
    originalText: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
    },
    modalFooter: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    // ... adicione outros estilos relacionados ao modal aqui, se houver
});

export default ValidationModal;

// Não esqueça de criar este arquivo em um diretório como `src/components/`