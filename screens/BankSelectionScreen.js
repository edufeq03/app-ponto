import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { AdMobBanner } from 'expo-ads-admob'; // Biblioteca correta para o Expo

// Importe suas funções de cálculo aqui
// Por exemplo: import { calculateTotalBankHours, getDailyRecordsForMonth } from '../services/timeService';

// ID de teste do AdMob, substitua pelo seu em produção
const adUnitId = __DEV__ ? 'ca-app-pub-1154181169569490~5358267605' : 'ca-app-pub-1154181169569490/4340204564';

const BankSelectionScreen = () => {
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    // Estados para os saldos
    const [monthlyBalance, setMonthlyBalance] = useState(0);
    const [totalBalance, setTotalBalance] = useState(0);

    // Dados de exemplo para o Picker
    const months = [
        { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
        { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
        { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
        { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
        { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
        { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 }
    ];

    const years = [2024, 2025, 2026]; // Defina seus anos aqui

    // Função que será responsável por buscar e calcular os dados
    const fetchData = async () => {
        setLoading(true);
        // Exemplo de como você faria o cálculo. Você precisará implementar essas funções.
        // const monthlyData = await getDailyRecordsForMonth(selectedMonth, selectedYear);
        // const totalData = await getAllRecordsSinceLastSettlement();

        // const calculatedMonthlyBalance = calculateTotalBankHours(monthlyData, ...);
        // const calculatedTotalBalance = calculateTotalBankHours(totalData, ...);

        // setMonthlyBalance(calculatedMonthlyBalance);
        // setTotalBalance(calculatedTotalBalance);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    // Função auxiliar para formatar minutos em HHh MMm
    const formatMinutesToHours = (minutes) => {
        const sign = minutes >= 0 ? '' : '-';
        const absMinutes = Math.abs(minutes);
        const hours = Math.floor(absMinutes / 60);
        const mins = absMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Banco de Horas</Text>

            {/* Seletor de Período */}
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedMonth}
                    onValueChange={(itemValue) => setSelectedMonth(itemValue)}
                    style={styles.picker}
                >
                    {months.map(m => <Picker.Item key={m.value} label={m.label} value={m.value} />)}
                </Picker>
                <Picker
                    selectedValue={selectedYear}
                    onValueChange={(itemValue) => setSelectedYear(itemValue)}
                    style={styles.picker}
                >
                    {years.map(y => <Picker.Item key={y} label={y.toString()} value={y} />)}
                </Picker>
            </View>

            {/* Saldos */}
            <View style={styles.balanceContainer}>
                <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Saldo do Mês</Text>
                    <Text style={[styles.balanceValue, monthlyBalance >= 0 ? styles.positiveText : styles.negativeText]}>
                        {formatMinutesToHours(monthlyBalance)}
                    </Text>
                </View>
                <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Saldo Total</Text>
                    <Text style={[styles.balanceValue, totalBalance >= 0 ? styles.positiveText : styles.negativeText]}>
                        {formatMinutesToHours(totalBalance)}
                    </Text>
                </View>
            </View>

            {/* Texto Explicativo */}
            <Text style={styles.infoText}>
                Para o cálculo correto do saldo, é essencial que os dias de trabalho tenham 4 marcações.
                Dias com menos marcações não serão considerados no balanço.
            </Text>

            {/* Opções de Navegação */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Relatório Detalhado')}
                >
                    <Ionicons name="document-text-outline" size={50} color="#007AFF" />
                    <Text style={styles.buttonText}>Relatório Detalhado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        // Lógica para navegar para a tela de registro de saques
                    }}
                >
                    <Ionicons name="log-out-outline" size={50} color="#4CAF50" />
                    <Text style={styles.buttonText}>Registrar Saque</Text>
                </TouchableOpacity>
            </View>

            {/* Espaço para Anúncio AdMob */}
            <View style={styles.adContainer}>
                <AdMobBanner
                    bannerSize="fullBanner"
                    adUnitID={adUnitId}
                    onDidFailToReceiveAdWithError={(e) => console.log('Ad failed to load:', e)}
                    onAdViewDidReceiveAd={() => console.log('Ad loaded successfully')}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
    },
    picker: {
        height: 50,
        width: '45%',
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    balanceBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        width: '48%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    balanceValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    positiveText: {
        color: 'green',
    },
    negativeText: {
        color: 'red',
    },
    infoText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        width: '45%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        textAlign: 'center',
    },
    adContainer: {
        marginTop: 'auto',
        alignSelf: 'center',
        height: 50, // Altura padrão do banner
    },
});

export default BankSelectionScreen;