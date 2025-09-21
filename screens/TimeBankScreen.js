import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase_config';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AdBannerPlaceholder from '../components/AdBannerPlaceholder'; // Importa o novo componente

const TimeBankScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);
    const [monthlyHours, setMonthlyHours] = useState(0);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
        { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
        { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
        { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
        { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
        { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 }
    ];
    const years = [2024, 2025, 2026];

    const formatDuration = (minutes) => {
        const sign = minutes >= 0 ? '+' : '-';
        const absoluteMinutes = Math.abs(minutes);
        const hours = Math.floor(absoluteMinutes / 60);
        const mins = absoluteMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    const calculateDailyHours = (dailyPoints) => {
        if (dailyPoints.length < 4) {
            return { balance: 0, worked: 0, required: 0 };
        }

        const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        let totalWorkedMinutes = 0;

        for (let i = 0; i < sortedPoints.length; i += 2) {
            if (sortedPoints[i + 1]) {
                const start = new Date(sortedPoints[i].timestamp_ponto);
                const end = new Date(sortedPoints[i + 1].timestamp_ponto);
                const durationInMinutes = (end - start) / (1000 * 60);
                totalWorkedMinutes += durationInMinutes;
            }
        }
        
        const standardWorkdayMinutes = 8 * 60;
        const balance = totalWorkedMinutes - standardWorkdayMinutes;

        return {
            balance,
            worked: totalWorkedMinutes,
            required: standardWorkdayMinutes
        };
    };

    const processPointsForBank = (pointsList) => {
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

    useEffect(() => {
        const q = query(
            collection(db, 'pontos'),
            orderBy('workday_date', 'asc'),
            orderBy('timestamp_ponto', 'asc')
        );

        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const pointsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                const totalBalance = processPointsForBank(pointsData);
                setTotalHours(totalBalance);

                const filteredByMonth = pointsData.filter(point => {
                    const pointDate = new Date(point.workday_date.split('-').join('/'));
                    return pointDate.getMonth() + 1 === selectedMonth && pointDate.getFullYear() === selectedYear;
                });
                const monthlyBalance = processPointsForBank(filteredByMonth);
                setMonthlyHours(monthlyBalance);

                setLoading(false);
            },
            (error) => {
                console.error("Erro ao carregar pontos: ", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [selectedMonth, selectedYear]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
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

            {/* Texto Explicativo */}
            <Text style={styles.infoText}>
                Para o cálculo correto do saldo, é essencial que os dias de trabalho tenham 4 marcações.
                Os dias com menos marcações não serão considerados no balanço.
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