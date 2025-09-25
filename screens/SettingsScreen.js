import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';

import { loadUserSettings, saveUserSettings } from '../services/settingsService';

// --- Componentes Reutilizáveis ---

// MUDANÇA AQUI: Novo componente de Modal de Informação
const InfoModal = ({ visible, onClose, title, content }) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalContent}>{content}</Text>
                <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={onClose}
                >
                    <Text style={styles.modalCloseButtonText}>Entendi</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const SettingGroup = ({ title, children }) => (
  <View style={styles.groupContainer}>
    <Text style={styles.groupTitle}>{title}</Text>
    {children}
  </View>
);

// MUDANÇA AQUI: Componente de botão de configuração com ícone de informação
const SettingButton = ({ title, value, onPress, onInfoPress, isPremium = false }) => (
  <View style={styles.settingRow}>
    <TouchableOpacity onPress={onPress} style={styles.settingButton}>
        <Text style={styles.settingButtonText}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.settingValue}>{value}</Text>
            {isPremium && <Text style={styles.premiumTag}>PREMIUM</Text>}
        </View>
    </TouchableOpacity>
    {onInfoPress && (
        <TouchableOpacity onPress={onInfoPress} style={styles.infoIcon}>
            <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
    )}
  </View>
);

const SettingsScreen = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    
    const [isEditingDailyHours, setIsEditingDailyHours] = useState(false);
    const [isEditingCutoffHour, setIsEditingCutoffHour] = useState(false);
    
    // MUDANÇA AQUI: Estado para o modal de informação
    const [infoModal, setInfoModal] = useState({ visible: false, title: '', content: '' });

    // Simulação do status Premium
    const isPremiumUser = false; 

    useEffect(() => {
        const fetchSettings = async () => {
            const userSettings = await loadUserSettings();
            setSettings(userSettings);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSaveSetting = async (key, value) => {
        if (!settings) return;
        
        const finalValue = (key === 'dailyStandardHours' || key === 'nightCutoffHour') 
                           ? parseInt(value, 10) 
                           : value;

        const newSettings = { ...settings, [key]: finalValue };
        setSettings(newSettings);
        
        const success = await saveUserSettings(newSettings);
        if (!success) {
             Alert.alert("Erro", "Falha ao salvar a configuração.");
        }
    };
    
    // --- Handlers de Componentes de Configuração ---

    const handleDateConfirm = (date) => {
        handleSaveSetting('settlementDate', date.toISOString());
        setDatePickerVisible(false);
    };

    const handlePolicyChange = (itemValue) => {
        handleSaveSetting('settlementPolicy', itemValue);
    };
    
    const handleDailyHoursChange = () => {
        if (!isEditingDailyHours) {
            setIsEditingDailyHours(true);
            return;
        }
        const hours = parseInt(settings.dailyStandardHours, 10);
        if (isNaN(hours) || hours <= 0 || hours > 24) {
            Alert.alert("Valor Inválido", "A jornada deve ser um número inteiro de 1 a 24.");
            return;
        }

        handleSaveSetting('dailyStandardHours', hours);
        setIsEditingDailyHours(false);
    };
    
    const handleCutoffHourChange = () => {
        if (!isEditingCutoffHour) {
            setIsEditingCutoffHour(true);
            return;
        }
        const hour = parseInt(settings.nightCutoffHour, 10);
        if (isNaN(hour) || hour < 0 || hour > 6) {
            Alert.alert("Valor Inválido", "O corte noturno deve ser um número inteiro entre 0 e 6.");
            return;
        }
        
        handleSaveSetting('nightCutoffHour', hour);
        setIsEditingCutoffHour(false);
    };

    // --- Lógica dos Modais de Informação ---
    const showInfo = (title, content) => {
        setInfoModal({ visible: true, title, content });
    };

    // MUDANÇA AQUI: Conteúdos dos modais
    const infoContent = {
        settlementDate: {
            title: "Data da Última Quitação",
            content: "Esta é a data usada como referência para calcular o saldo do seu banco de horas. Todo o saldo anterior a esta data é considerado zerado (quitado). Verifique com o RH ou gestão da sua empresa para garantir que a data está correta."
        },
        settlementPolicy: {
            title: "Política de Quitação",
            content: "Define a frequência com que o saldo do seu banco de horas é zerado. Se Anual, o saldo acumula por um ano. Se Semestral, a cada seis meses. Escolha a regra da sua empresa."
        },
        dailyStandardHours: {
            title: "Jornada Padrão Diária",
            content: "O número de horas que você deve trabalhar por dia (ex: 8). O sistema usará essa informação para calcular se você tem horas extras ou faltantes no seu banco de horas: (Horas Trabalhadas - Jornada Padrão = Saldo Diário)."
        },
        nightCutoffHour: {
            title: "Horário de Corte Noturno",
            content: "Define a hora limite (de 0 a 6) para que o ponto seja considerado do dia de trabalho anterior. Ex: Se o corte é 5h, um ponto registrado às 03:00 da manhã é incluído no dia anterior. Use 0 se sua jornada não inclui a madrugada."
        }
    };


    if (loading || !settings) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a148c" />
                <Text style={{ marginTop: 10, color: '#4a148c' }}>Carregando configurações...</Text>
            </View>
        );
    }
    
    const settlementDateFormatted = new Date(settings.settlementDate).toLocaleDateString('pt-BR');


    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Configurações</Text>

            <InfoModal 
                visible={infoModal.visible}
                onClose={() => setInfoModal({ ...infoModal, visible: false })}
                title={infoModal.title}
                content={infoModal.content}
            />

            {/* STATUS PREMIUM */}
            <SettingGroup title="Sua Conta">
                <Text style={styles.currentStatus}>Plano Atual: {isPremiumUser ? 'Premium' : 'Gratuito'}</Text>
                {!isPremiumUser && (
                    <TouchableOpacity onPress={() => Alert.alert("Upgrade", "Levar para a tela de planos.")} style={styles.upgradeButton}>
                        <Text style={styles.upgradeButtonText}>Desbloquear Funcionalidades Premium</Text>
                    </TouchableOpacity>
                )}
            </SettingGroup>

            {/* CONFIGURAÇÕES BÁSICAS DE PONTO */}
            <SettingGroup title="Controle de Jornada">
                
                {/* Data de Quitação */}
                <SettingButton 
                    title="Data da Última Quitação"
                    value={settlementDateFormatted}
                    onPress={() => setDatePickerVisible(true)}
                    onInfoPress={() => showInfo(infoContent.settlementDate.title, infoContent.settlementDate.content)}
                />
                
                {/* Política de Quitação (CORREÇÃO AQUI) */}
                <SettingButton 
                    title="Política de Quitação"
                    value={settings.settlementPolicy}
                    onPress={() => Alert.alert(
                        "Política de Quitação",
                        "Selecione a frequência de quitação:",
                        [
                            { text: "Anual", onPress: () => handlePolicyChange('Anual') },
                            { text: "Semestral", onPress: () => handlePolicyChange('Semestral') },
                            { text: "Cancelar", style: "cancel" },
                        ]
                    )}
                    onInfoPress={() => showInfo(infoContent.settlementPolicy.title, infoContent.settlementPolicy.content)}
                />


                {/* Jornada Padrão Diária */}
                <View style={[styles.settingRow]}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Jornada Padrão Diária</Text>
                        <View style={styles.hoursInputContainer}>
                            <TextInput
                                style={styles.hoursInput}
                                value={String(settings.dailyStandardHours)}
                                onChangeText={(text) => setSettings({ ...settings, dailyStandardHours: text })}
                                keyboardType='numeric'
                                maxLength={2}
                                editable={isEditingDailyHours}
                            />
                            <Text style={styles.settingValue}>h</Text>
                            <TouchableOpacity style={styles.saveButton} onPress={handleDailyHoursChange}>
                                <Text style={styles.saveButtonText}>{isEditingDailyHours ? 'Salvar' : 'Editar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => showInfo(infoContent.dailyStandardHours.title, infoContent.dailyStandardHours.content)} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
                
                {/* Horário de Corte Noturno */}
                <View style={[styles.settingRow]}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Horário de Corte Noturno</Text>
                        <View style={styles.hoursInputContainer}>
                            <TextInput
                                style={styles.hoursInput}
                                value={String(settings.nightCutoffHour)}
                                onChangeText={(text) => setSettings({ ...settings, nightCutoffHour: text })}
                                keyboardType='numeric'
                                maxLength={1}
                                editable={isEditingCutoffHour}
                            />
                            <Text style={styles.settingValue}>h</Text>
                            <TouchableOpacity style={styles.saveButton} onPress={handleCutoffHourChange}>
                                <Text style={styles.saveButtonText}>{isEditingCutoffHour ? 'Salvar' : 'Editar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => showInfo(infoContent.nightCutoffHour.title, infoContent.nightCutoffHour.content)} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>


            </SettingGroup>

            {/* CONFIGURAÇÕES PREMIUM (GESTÃO) */}
            <SettingGroup title="Gestão de Equipe (Premium)">
                
                <SettingButton 
                    title="Gerenciar Colaboradores"
                    value="0 Colaboradores"
                    onPress={() => Alert.alert('Acesso Premium', 'Recurso disponível apenas para usuários Premium.')}
                    isPremium={true}
                />

                <SettingButton 
                    title="Visualizar Relatórios Consolidados"
                    value=""
                    onPress={() => Alert.alert('Acesso Premium', 'Recurso disponível apenas para usuários Premium.')}
                    isPremium={true}
                />

            </SettingGroup>
            
            <View style={{ height: 50 }} />

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleDateConfirm}
                onCancel={() => setDatePickerVisible(false)}
                date={new Date(settings.settlementDate)}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#4a148c',
        padding: 20,
        paddingBottom: 10,
    },
    groupContainer: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 10,
        paddingHorizontal: 15,
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
        marginBottom: 5,
        paddingTop: 10,
    },
    // MUDANÇA AQUI: Novo estilo para a linha de configuração completa
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    settingButton: {
        flex: 1, // Permite que o botão ocupe o máximo de espaço
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingRight: 10, // Espaço para o ícone
    },
    settingButtonText: {
        fontSize: 16,
        color: '#333',
        flexShrink: 1,
    },
    settingValue: {
        fontSize: 16,
        color: '#6a1b9a',
        fontWeight: '600',
        marginRight: 5,
    },
    infoIcon: {
        padding: 5,
        marginLeft: 5,
    },
    premiumTag: {
        fontSize: 10,
        color: '#FFD700',
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
        marginBottom: 10,
        textAlign: 'center',
    },
    upgradeButton: {
        backgroundColor: '#6a1b9a',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    upgradeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    hoursInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hoursInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        width: 40,
        textAlign: 'center',
        marginRight: 5,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#6a1b9a',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginLeft: 5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    // Estilos do InfoModal
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 15,
        padding: 25,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#4a148c',
    },
    modalContent: {
        marginBottom: 20,
        textAlign: 'justify',
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    modalCloseButton: {
        backgroundColor: "#6a1b9a",
        borderRadius: 8,
        padding: 10,
        elevation: 2,
        minWidth: 100,
    },
    modalCloseButtonText: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    }
});

export default SettingsScreen;