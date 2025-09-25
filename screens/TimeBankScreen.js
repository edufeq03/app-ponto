import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore'; // Importa 'where'
import { db, auth } from '../config/firebase_config'; // Importa 'auth'
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Importa useFocusEffect
import { Ionicons } from '@expo/vector-icons';
import AdBannerPlaceholder from '../components/AdBannerPlaceholder';
import { loadUserSettings } from '../services/settingsService';

const TimeBankScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);
    const [monthlyHours, setMonthlyHours] = useState(0);
    const [userSettings, setUserSettings] = useState(null); 

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [pointsData, setPointsData] = useState([]); // Adicionado estado para os pontos crus

    const months = [
        { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
        { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
        { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
        { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
        { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
        { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 }
    ];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1]; // Adicionado anos dinâmicos

    const formatDuration = (minutes) => {
        const sign = minutes >= 0 ? '+' : '-';
        const absoluteMinutes = Math.abs(minutes);
        const hours = Math.floor(absoluteMinutes / 60);
        const mins = absoluteMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    // FUNÇÃO DE CÁLCULO ATUALIZADA (Dedução de 1 hora de almoço)
    const calculateDailyHours = (dailyPoints) => {
        if (dailyPoints.length < 2 || !userSettings) {
            return { balance: 0, worked: 0, required: 0 };
        }
        
        const standardWorkdayMinutes = userSettings.dailyStandardHours * 60;
        
        const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        
        const pontoEntrada = new Date(sortedPoints[0].timestamp_ponto);
        const pontoSaida = new Date(sortedPoints[sortedPoints.length - 1].timestamp_ponto);
        
        let totalWorkedMinutesGross = (pontoSaida.getTime() - pontoEntrada.getTime()) / (1000 * 60);

        if (totalWorkedMinutesGross < 0) totalWorkedMinutesGross = 0;
        
        const lunchBreakMinutes = 60; 
        
        const effectiveWorkedMinutes = totalWorkedMinutesGross - lunchBreakMinutes; 

        const balance = effectiveWorkedMinutes - standardWorkdayMinutes;

        return {
            balance,
            worked: effectiveWorkedMinutes, 
            required: standardWorkdayMinutes
        };
    };

    const processPointsForBank = (pointsList) => {
        if (!userSettings) return 0;

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

        const accumulatedBalance = dailySummary.reduce((sum, day) => sum + day.balance, 0);
        return accumulatedBalance;
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


    // >>>>> CORREÇÃO APLICADA AQUI: useFocusEffect para recarregar no foco da tela <<<<<
    useFocusEffect(
        React.useCallback(() => {
            if (!userSettings) return;

            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Erro", "Usuário não autenticado.");
                setLoading(false);
                return;
            }

            // Garante que o usuário logado está sendo usado na query
            const q = query(
                collection(db, 'pontos'),
                where('usuario_id', '==', user.uid), // Adicionado filtro por usuário
                orderBy('workday_date', 'asc'),
                orderBy('timestamp_ponto', 'asc')
            );

            // onSnapshot é a forma correta de receber atualizações em tempo real
            const unsubscribe = onSnapshot(
                q,
                (querySnapshot) => {
                    const latestPointsData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setPointsData(latestPointsData); // Salva os dados crus
                    setLoading(false); // Só termina o loading após buscar os dados

                    // Processa o saldo total imediatamente
                    const totalBalance = processPointsForBank(latestPointsData);
                    setTotalHours(totalBalance);

                    // Re-calcula o saldo do mês/ano selecionado
                    const filteredByMonth = latestPointsData.filter(point => {
                        const pointDateParts = point.workday_date.split('/').map(p => parseInt(p, 10)); 
                        return pointDateParts[1] === selectedMonth && pointDateParts[2] === selectedYear;
                    });
                    
                    const monthlyBalance = processPointsForBank(filteredByMonth);
                    setMonthlyHours(monthlyBalance);
                },
                (error) => {
                    console.error("Erro ao carregar pontos: ", error);
                    setLoading(false);
                }
            );

            // Função de cleanup que é chamada ao desfocar a tela
            return () => unsubscribe();
        }, [userSettings]) // Roda quando settings é carregado pela primeira vez
    ); 

    // Efeito para recalcular o saldo do mês quando o seletor mudar
    useEffect(() => {
        if (!userSettings || pointsData.length === 0) {
            setMonthlyHours(0);
            return;
        }

        const filteredByMonth = pointsData.filter(point => {
            const pointDateParts = point.workday_date.split('/').map(p => parseInt(p, 10)); 
            return pointDateParts[1] === selectedMonth && pointDateParts[2] === selectedYear;
        });
        
        const monthlyBalance = processPointsForBank(filteredByMonth);
        setMonthlyHours(monthlyBalance);

    }, [selectedMonth, selectedYear, pointsData, userSettings]); // Dependência de pointsData

    // Altera o loading para considerar também o carregamento das configurações
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
                O cálculo do saldo se baseia na Jornada Padrão de **{userSettings.dailyStandardHours} horas** e considera apenas a 1ª Entrada e a última Saída, deduzindo 1 hora de almoço.
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