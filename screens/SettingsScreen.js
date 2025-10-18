import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

// --- NOVIDADES: Importação do Contexto ---
import { useSettings } from '../src/context/SettingsContext'; // Importa o hook do contexto

import { loadUserSettings, saveUserSettings } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../services/settingsService'; 

// --- Componentes Reutilizáveis ---

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

const SettingButton = ({ title, value, onPress, onInfoPress, isPremium = false, style = {} }) => (
  <View style={[styles.settingRow, style]}>
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

// --- Componente Principal ---

const SettingsScreen = () => {
    const navigation = useNavigation();
    
    // --- NOVO: Puxa settings e a função de update do Contexto ---
    const { settings: contextSettings, updateSettingsLocally } = useSettings(); 

    // O estado local é inicializado com o valor do contexto (garantidamente carregado)
    const [settings, setSettings] = useState(contextSettings || DEFAULT_SETTINGS); 
    const [loading, setLoading] = useState(false); // O loading inicial é tratado pelo Provider
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    
    // Estados para edição de números/horas
    const [isEditingJornada, setIsEditingJornada] = useState(false);
    const [isEditingCutoffHour, setIsEditingCutoffHour] = useState(false);
    const [isEditingDuration, setIsEditingDuration] = useState(false); 
    const [isEditingLimit, setIsEditingLimit] = useState(false); 
    
    // Estados para edição de Horários (HH:MM)
    const [isEditingEntryTime, setIsEditingEntryTime] = useState(false);
    const [isEditingExitTime, setIsEditingExitTime] = useState(false);
    
    const [infoModal, setInfoModal] = useState({ visible: false, title: '', content: '' });

    // Simulação do status Premium
    const isPremiumUser = false; 

    // Use o useEffect para garantir que o estado local seja atualizado se o contexto mudar (ex: update em outra tela)
    useEffect(() => {
        if (contextSettings && settings !== contextSettings) {
            setSettings(contextSettings);
        }
    }, [contextSettings]);


    const handleSaveSetting = async (key, value) => {
        if (!settings) return;
        
        // Converte para Inteiro apenas as chaves que sabemos que são numéricas
        const numericKeys = [
            'jornada_diaria_padrao_horas', 
            'nightCutoffHour', 
            'duracao_intervalo_minutos', 
            'limite_banco_horas_diario_minutos'
        ];
        let finalValue = value;

        if (numericKeys.includes(key)) {
            finalValue = parseInt(value, 10);
            if (isNaN(finalValue) || finalValue < 0) {
                Alert.alert("Valor Inválido", `O valor para ${key} deve ser um número inteiro positivo.`);
                return;
            }
        }
        
        // Verifica o formato da hora (HH:MM)
        if (key === 'horario_entrada_padrao' || key === 'horario_saida_padrao') {
            if (!/^\d{2}:\d{2}$/.test(finalValue)) {
                Alert.alert("Formato Inválido", "O horário deve estar no formato HH:MM (ex: 08:00).");
                return;
            }
        }

        const newSettings = { ...settings, [key]: finalValue };

        const success = await saveUserSettings(newSettings);
        
        if (success) {
            setSettings(newSettings);
            updateSettingsLocally(newSettings); // <-- CHAVE: ATUALIZA O CONTEXTO GLOBAL
            Alert.alert("Sucesso", "Configuração salva.");
        } else {
            Alert.alert("Erro", "Falha ao salvar a configuração. Tente novamente.");
        }
    };

    const handleJornadaChange = (text) => {
        setSettings(prev => ({ 
            ...prev, 
            jornada_diaria_padrao_horas: text 
        }));
    };
    
    const handleCutoffHourChange = (text) => {
        setSettings(prev => ({ 
            ...prev, 
            nightCutoffHour: text 
        }));
    };

    const handleIntervalDurationChange = (text) => {
        setSettings(prev => ({ 
            ...prev, 
            duracao_intervalo_minutos: text 
        }));
    };

    const handleLimitChange = (text) => {
        setSettings(prev => ({ 
            ...prev, 
            limite_banco_horas_diario_minutos: text 
        }));
    };

    const handleNavigateToLegal = () => {
        navigation.navigate('Referências Legais'); 
    };

    // --- Lógica de Formatação de Tempo ---
    const formatTime = (time) => {
        if (!time || typeof time !== 'string') return '00:00';
        // Assume format "HH:MM"
        return time; 
    }

    if (!settings) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a148c" />
                <Text style={{ marginTop: 10, color: '#4a148c' }}>Carregando configurações...</Text>
            </View>
        );
    }
    
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Ajustes do Ponto</Text>

            {/* Modal de Informação */}
            <InfoModal 
                visible={infoModal.visible}
                onClose={() => setInfoModal({ ...infoModal, visible: false })}
                title={infoModal.title}
                content={infoModal.content}
            />

            {/* Configurações de Jornada */}
            <SettingGroup title="Jornada e Intervalo">
                {/* JORNADA PADRÃO */}
                <View style={styles.settingRow}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Jornada Diária Padrão (horas)</Text>
                        {!isEditingJornada ? (
                            <TouchableOpacity onPress={() => setIsEditingJornada(true)}>
                                <Text style={styles.settingValue}>{settings.jornada_diaria_padrao_horas}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    onChangeText={handleJornadaChange}
                                    value={String(settings.jornada_diaria_padrao_horas)}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity 
                                    style={styles.saveButton}
                                    onPress={() => {
                                        handleSaveSetting('jornada_diaria_padrao_horas', settings.jornada_diaria_padrao_horas);
                                        setIsEditingJornada(false);
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setInfoModal({
                        visible: true,
                        title: 'Jornada Padrão',
                        content: 'Define o número de horas que você deve trabalhar por dia. Usado para calcular se você fez horas extras ou falta.'
                    })} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* DURAÇÃO DO INTERVALO */}
                <View style={styles.settingRow}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Duração Padrão do Intervalo (minutos)</Text>
                        {!isEditingDuration ? (
                            <TouchableOpacity onPress={() => setIsEditingDuration(true)}>
                                <Text style={styles.settingValue}>{settings.duracao_intervalo_minutos}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    onChangeText={handleIntervalDurationChange}
                                    value={String(settings.duracao_intervalo_minutos)}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity 
                                    style={styles.saveButton}
                                    onPress={() => {
                                        handleSaveSetting('duracao_intervalo_minutos', settings.duracao_intervalo_minutos);
                                        setIsEditingDuration(false);
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setInfoModal({
                        visible: true,
                        title: 'Intervalo Padrão',
                        content: 'O tempo que será subtraído do seu total de horas trabalhadas como pausa para almoço/lanche, caso não haja um registro de saída/retorno do intervalo.'
                    })} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* HORÁRIO PADRÃO DE ENTRADA (Picker/Time) */}
                <SettingButton 
                    title="Horário Padrão de Entrada" 
                    value={formatTime(settings.horario_entrada_padrao)} 
                    onPress={() => Alert.alert("Ajuste Manual", "Ajuste o campo 'horario_entrada_padrao' no Firestore (ex: 08:00).")}
                    onInfoPress={() => setInfoModal({
                        visible: true,
                        title: 'Horário Padrão de Entrada',
                        content: 'Sugere o horário para o registro de entrada (pode ser usado em cálculos futuros ou sugestões de preenchimento). Atualmente precisa ser ajustado diretamente no Firebase.'
                    })}
                />

                {/* HORÁRIO PADRÃO DE SAÍDA (Picker/Time) */}
                <SettingButton 
                    title="Horário Padrão de Saída" 
                    value={formatTime(settings.horario_saida_padrao)} 
                    onPress={() => Alert.alert("Ajuste Manual", "Ajuste o campo 'horario_saida_padrao' no Firestore (ex: 17:00).")}
                    onInfoPress={() => setInfoModal({
                        visible: true,
                        title: 'Horário Padrão de Saída',
                        content: 'Sugere o horário para o registro de saída. Atualmente precisa ser ajustado diretamente no Firebase.'
                    })}
                />
            </SettingGroup>

            {/* Configurações de Banco de Horas e Noturno */}
            <SettingGroup title="Banco de Horas e Adicional">
                {/* LIMITE DO BANCO DE HORAS */}
                <View style={styles.settingRow}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Limite Diário do Banco (minutos)</Text>
                        {!isEditingLimit ? (
                            <TouchableOpacity onPress={() => setIsEditingLimit(true)}>
                                <Text style={styles.settingValue}>{settings.limite_banco_horas_diario_minutos}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    onChangeText={handleLimitChange}
                                    value={String(settings.limite_banco_horas_diario_minutos)}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity 
                                    style={styles.saveButton}
                                    onPress={() => {
                                        handleSaveSetting('limite_banco_horas_diario_minutos', settings.limite_banco_horas_diario_minutos);
                                        setIsEditingLimit(false);
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setInfoModal({
                        visible: true,
                        title: 'Limite do Banco',
                        content: 'Define o limite máximo de horas extras que podem ser acumuladas por dia (em minutos) para o cálculo do Banco de Horas. O excedente será considerado hora extra (se aplicável).'
                    })} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* HORA DE CORTE NOTURNO */}
                <View style={styles.settingRow}>
                    <View style={styles.settingButton}>
                        <Text style={styles.settingButtonText}>Hora de Corte Noturno (0-23h)</Text>
                        {!isEditingCutoffHour ? (
                            <TouchableOpacity onPress={() => setIsEditingCutoffHour(true)}>
                                <Text style={styles.settingValue}>{settings.nightCutoffHour}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    onChangeText={handleCutoffHourChange}
                                    value={String(settings.nightCutoffHour)}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity 
                                    style={styles.saveButton}
                                    onPress={() => {
                                        handleSaveSetting('nightCutoffHour', settings.nightCutoffHour);
                                        setIsEditingCutoffHour(false);
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => setInfoModal({
                        visible: true,
                        title: 'Hora de Corte Noturno',
                        content: 'Define a hora (0 a 23) usada para determinar se um ponto de saída é do dia atual ou se pertence ao dia anterior (para quem trabalha até de madrugada). Ex: 5 (5h da manhã).'
                    })} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            </SettingGroup>
            
            {/* --- NOVO GRUPO: Referências Legais --- */}
            <SettingGroup title="Recursos e Informações">
                <SettingButton 
                    title="Referências Legais (CLT, Vídeos)" 
                    value="Ver Conteúdo" 
                    onPress={handleNavigateToLegal}
                    style={{ backgroundColor: '#fff', elevation: 1 }}
                    onInfoPress={() => setInfoModal({
                        visible: true,
                        title: 'Referências Legais',
                        content: 'Consulte artigos da CLT e conteúdo de advogados parceiros sobre jornada de trabalho, banco de horas e direitos. Inclui conteúdo exclusivo para monetização.'
                    })}
                />
            </SettingGroup>


            {/* Configurações Premium (Manter para a simulação) */}
            <SettingGroup title="Status Premium">
                <Text style={styles.currentStatus}>
                    Status Atual: {isPremiumUser ? 'Premium' : 'Básico (Grátis)'}
                </Text>
                {!isPremiumUser && (
                    <TouchableOpacity style={styles.upgradeButton}>
                        <Text style={styles.upgradeButtonText}>Fazer Upgrade para Premium</Text>
                    </TouchableOpacity>
                )}
            </SettingGroup>

            <View style={{ height: 50 }} />
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4a148c',
        padding: 15,
        textAlign: 'center',
    },
    groupContainer: {
        backgroundColor: '#fff',
        padding: 10,
        marginVertical: 8,
        marginHorizontal: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    groupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4a148c',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingButtonText: {
        fontSize: 16,
        color: '#333',
        flexShrink: 1,
        marginRight: 10,
    },
    settingValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6a1b9a',
    },
    infoIcon: {
        paddingLeft: 10,
    },
    premiumTag: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
        backgroundColor: 'gold',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    // Estilos de Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 5,
        borderRadius: 5,
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
        backgroundColor: '#4a148c',
        borderRadius: 10,
        padding: 10,
        elevation: 2,
    },
    modalCloseButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // Status Premium
    currentStatus: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    upgradeButton: {
        backgroundColor: 'gold',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
});

export default SettingsScreen;