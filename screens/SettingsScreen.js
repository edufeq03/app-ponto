import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// Componente simples para agrupar opções
const SettingGroup = ({ title, children }) => (
  <View style={styles.groupContainer}>
    <Text style={styles.groupTitle}>{title}</Text>
    {children}
  </View>
);

// Componente de exemplo para um botão de ação
const SettingButton = ({ title, onPress, isPremium = false }) => (
  <TouchableOpacity onPress={onPress} style={styles.settingButton}>
    <Text style={styles.settingButtonText}>{title}</Text>
    {isPremium && <Text style={styles.premiumTag}>PREMIUM</Text>}
    <Ionicons name="chevron-forward-outline" size={24} color="#6a1b9a" />
  </TouchableOpacity>
);


const SettingsScreen = () => {
    // Exemplo de estados para o banco de horas
    const [lastSettlementDate, setLastSettlementDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [settlementPolicy, setSettlementPolicy] = useState('Anual');
    
    // Simulação do status Premium
    const isPremiumUser = false; 

    const handleDateConfirm = (date) => {
        setLastSettlementDate(date);
        setDatePickerVisible(false);
        // Aqui você chamaria uma função para salvar no Firestore
        Alert.alert("Sucesso", "Data de quitação salva.");
    };

    const handleUpgradePress = () => {
        Alert.alert("Plano Premium", "Levar para a tela de planos de assinatura.");
    };
    
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Configurações</Text>

            {/* STATUS PREMIUM */}
            <SettingGroup title="Sua Conta">
                <Text style={styles.currentStatus}>Plano Atual: {isPremiumUser ? 'Premium' : 'Gratuito'}</Text>
                {!isPremiumUser && (
                    <TouchableOpacity onPress={handleUpgradePress} style={styles.upgradeButton}>
                        <Text style={styles.upgradeButtonText}>Desbloquear Funcionalidades Premium</Text>
                    </TouchableOpacity>
                )}
            </SettingGroup>

            {/* CONFIGURAÇÕES BÁSICAS DE PONTO */}
            <SettingGroup title="Controle de Jornada">
                
                <SettingButton 
                    title={`Data de Quitação: ${lastSettlementDate.toLocaleDateString('pt-BR')}`}
                    onPress={() => setDatePickerVisible(true)}
                />
                
                <SettingButton 
                    title={`Política de Quitação: ${settlementPolicy}`}
                    onPress={() => Alert.alert('Política', 'Selecionar entre Anual, Semestral, Mensal...')}
                />

                <SettingButton 
                    title="Jornada Padrão Diária (8:00h)"
                    onPress={() => Alert.alert('Jornada', 'Ajustar horas/minutos padrão...')}
                />
                
                <SettingButton 
                    title="Ajustar Horário de Corte Noturno (05:00h)"
                    onPress={() => Alert.alert('Corte Noturno', 'Ajustar horário de 00:00 a 06:00...')}
                />

            </SettingGroup>

            {/* CONFIGURAÇÕES PREMIUM (GESTÃO) */}
            <SettingGroup title="Gestão de Equipe (Premium)">
                
                <SettingButton 
                    title="Gerenciar Colaboradores"
                    onPress={() => Alert.alert('Acesso Premium', 'Recurso disponível apenas para usuários Premium.')}
                    isPremium={true}
                />

                <SettingButton 
                    title="Visualizar Relatórios Consolidados"
                    onPress={() => Alert.alert('Acesso Premium', 'Recurso disponível apenas para usuários Premium.')}
                    isPremium={true}
                />

            </SettingGroup>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerVisible(false)}
                date={lastSettlementDate}
                locale="pt-BR"
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#4a148c', // Roxo escuro
        padding: 20,
        paddingBottom: 10,
    },
    groupContainer: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 10,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    groupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    settingButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    settingButtonText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    premiumTag: {
        fontSize: 10,
        color: '#FFD700', // Dourado
        backgroundColor: '#4a148c',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    currentStatus: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        textAlign: 'center',
    },
    upgradeButton: {
        backgroundColor: '#6a1b9a', // Roxo médio
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5,
    },
    upgradeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SettingsScreen;