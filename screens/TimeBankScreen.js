// src/screens/TimeBankScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'; 
import { db, auth } from '../config/firebase_config'; 
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { Ionicons } from '@expo/vector-icons';
import AdBannerPlaceholder from '../components/AdBannerPlaceholder';
import { loadUserSettings } from '../services/settingsService';

const TimeBankScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);
    const [monthlyHours, setMonthlyHours] = useState(0);
    const [userSettings, setUserSettings] = useState(null); 
    const [dailySummary, setDailySummary] = useState([]); // NOVO ESTADO para o relatório detalhado

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [pointsData, setPointsData] = useState([]); 

    const months = [
        { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
        { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
        { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
        { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
        { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
        { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 }
    ];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1]; 

    const formatDuration = (minutes) => {
        const sign = minutes >= 0 ? '+' : '-';
        const absoluteMinutes = Math.abs(minutes);
        const hours = Math.floor(absoluteMinutes / 60);
        const mins = absoluteMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    // FUNÇÃO DE CÁLCULO ATUALIZADA
    const calculateDailyHours = (dailyPoints) => {
        // MUDANÇA AQUI: Regra do Banco de Horas: Saldo só é calculado se houver 4 ou mais marcações.
        if (dailyPoints.length < 4 || !userSettings) {
            return { 
                balance: 0, 
                worked: 0, 
                required: userSettings ? userSettings.dailyStandardHours * 60 : 0,
                rawPoints: dailyPoints // Inclui os pontos brutos
            };
        }
        
        const standardWorkdayMinutes = userSettings.dailyStandardHours * 60;
        
        const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        
        const pontoEntrada = new Date(sortedPoints[0].timestamp_ponto);
        const pontoSaida = new Date(sortedPoints[sortedPoints.length - 1].timestamp_ponto);
        
        let totalWorkedMinutesGross = (pontoSaida.getTime() - pontoEntrada.getTime()) / (1000 * 60);

        if (totalWorkedMinutesGross < 0) totalWorkedMinutesGross = 0;
        
        // Regra atual: Dedução fixa de 1 hora (60 minutos) de almoço,
        // pois a jornada está completa (4 pontos garantidos).
        const lunchBreakMinutes = 60; 
        
        const effectiveWorkedMinutes = totalWorkedMinutesGross - lunchBreakMinutes; 

        const balance = effectiveWorkedMinutes - standardWorkdayMinutes;

        return {
            balance,
            worked: effectiveWorkedMinutes, 
            required: standardWorkdayMinutes,
            rawPoints: dailyPoints // Inclui os pontos brutos
        };
    };

    // FUNÇÃO QUE PROCESSA E RETORNA O SALDO TOTAL E O RESUMO DIÁRIO
    const processPointsForBank = (pointsList) => {
        if (!userSettings) return { totalBalance: 0, dailySummary: [] }; // MUDANÇA: Retorna objeto

        const grouped = {};
        pointsList.forEach(point => {
            const date = point.workday_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(point);
        });

        const dailySummary = Object.keys(grouped).map(date => {
            const dailyStats = calculateDailyHours(grouped[date]); 
            return {
                date,
                ...dailyStats
            };
        });

        // O acumulado soma o 'balance' apenas dos dias que cumpriram a regra de 4 pontos (pois 'balance' será 0 nos outros dias).
        const accumulatedBalance = dailySummary.reduce((sum, day) => sum + day.balance, 0);
        
        return { totalBalance: accumulatedBalance, dailySummary }; // MUDANÇA: Retorna o objeto completo
    };

    // NOVO useEffect para carregar as configurações do usuário primeiro
    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await loadUserSettings();
            setUserSettings(settings);
            // O loading será setado para false apenas após a primeira busca de pontos.
        };
        fetchSettings();
    }, []);


    // >>>>> useFocusEffect para recarregar no foco da tela <<<<<
    useFocusEffect(
        React.useCallback(() => {
            if (!userSettings) return;

            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Erro", "Usuário não autenticado.");
                setLoading(false);
                return;
            }

            const q = query(
                collection(db, 'pontos'),
                where('usuario_id', '==', user.uid), 
                orderBy('workday_date', 'asc'),
                orderBy('timestamp_ponto', 'asc')
            );

            const unsubscribe = onSnapshot(
                q,
                (querySnapshot) => {
                    const latestPointsData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setPointsData(latestPointsData); 
                    setLoading(false); 

                    // Processa o saldo total e o resumo diário
                    const { totalBalance, dailySummary: fullDailySummary } = processPointsForBank(latestPointsData); // MUDANÇA: Desestrutura e pega o resumo
                    setTotalHours(totalBalance);
                    // Aqui você pode salvar o resumo diário completo se for necessário em outra tela
                    // setDailySummary(fullDailySummary); 

                    // Re-calcula o saldo do mês/ano selecionado
                    const filteredByMonth = latestPointsData.filter(point => {
                        const pointDateParts = point.workday_date.split('/').map(p => parseInt(p, 10)); 
                        return pointDateParts[1] === selectedMonth && pointDateParts[2] === selectedYear;
                    });
                    
                    const { totalBalance: monthlyBalance, dailySummary: monthlyDailySummary } = processPointsForBank(filteredByMonth); // MUDANÇA: Desestrutura
                    setMonthlyHours(monthlyBalance);
                    setDailySummary(monthlyDailySummary); // Salva o resumo DO MÊS SELECIONADO para o PDF

                },
                (error) => {
                    console.error("Erro ao carregar pontos: ", error);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        }, [userSettings]) 
    ); 

    // Efeito para recalcular o saldo do mês quando o seletor mudar
    useEffect(() => {
        if (!userSettings || pointsData.length === 0) {
            setMonthlyHours(0);
            setDailySummary([]);
            return;
        }

        const filteredByMonth = pointsData.filter(point => {
            const pointDateParts = point.workday_date.split('/').map(p => parseInt(p, 10)); 
            return pointDateParts[1] === selectedMonth && pointDateParts[2] === selectedYear;
        });
        
        const { totalBalance: monthlyBalance, dailySummary: monthlyDailySummary } = processPointsForBank(filteredByMonth); // MUDANÇA: Desestrutura
        setMonthlyHours(monthlyBalance);
        setDailySummary(monthlyDailySummary); // Salva o resumo para o PDF
    }, [selectedMonth, selectedYear, pointsData, userSettings]); 


    if (loading || !userSettings) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a148c" />
                <Text style={{ marginTop: 10, color: '#4a148c' }}>Carregando dados e configurações...</Text>
            </SafeAreaView>
        );
    }

    // ... (O restante do componente, incluindo o return, permanece inalterado)
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
                    <Text style={[styles.balanceValue, monthlyHours >= 0 ? styles.positiveText : styles.negativeText]}>
                        {formatDuration(monthlyHours)}
                    </Text>
                </View>
                <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Saldo Total</Text>
                    <Text style={[styles.balanceValue, totalHours >= 0 ? styles.positiveText : styles.negativeText]}>
                        {formatDuration(totalHours)}
                    </Text>
                </View>
            </View>

            {/* Texto Explicativo (ATUALIZADO) */}
            <Text style={styles.infoText}>
                O cálculo do saldo se baseia na Jornada Padrão de **{userSettings.dailyStandardHours} horas** e considera apenas a 1ª Entrada e a última Saída, deduzindo 1 hora de almoço. **O saldo é contabilizado apenas em dias com 4 marcações.**
            </Text>

            {/* Opções de Navegação */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    // MUDANÇA AQUI: Passa os dados para a tela de relatório
                    onPress={() => navigation.navigate('Relatório Detalhado', { 
                        dailySummary: dailySummary,
                        selectedMonth: selectedMonth,
                        selectedYear: selectedYear
                    })}
                >
                    <Ionicons name="document-text-outline" size={50} color="#007AFF" />
                    <Text style={styles.buttonText}>Relatório Detalhado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => { /* Lógica para navegar para a tela de registro de saques */ }}
                >
                    <Ionicons name="log-out-outline" size={50} color="#4CAF50" />
                    <Text style={styles.buttonText}>Registrar Saque</Text>
                </TouchableOpacity>
            </View>

            {/* Espaço para Anúncio AdMob (Placeholder) */}
            <AdBannerPlaceholder />
        </SafeAreaView>
    );
};

// ... (Restante dos estilos inalterados)
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
});

export default TimeBankScreen;