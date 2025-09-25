import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { Picker } from '@react-native-picker/picker';
import { loadUserSettings } from '../services/settingsService';
import { useFocusEffect } from '@react-navigation/native';
import AdBannerPlaceholder from '../components/AdBannerPlaceholder';

// Novo utilitário para formatar a hora a partir do timestamp ISO
const formatTime = (isoString) => {
    if (!isoString) return '';
    // Converte o timestamp ISO (ou Firebase Timestamp) para um objeto Date
    const date = new Date(isoString); 
    // Retorna a hora e minuto formatados (ex: 08:00)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const ReportScreen = () => {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState(null);
    const [dailySummary, setDailySummary] = useState([]);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Configurações do Picker
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

    // FUNÇÃO DE CÁLCULO DE SALDO DIÁRIO
    const calculateDailyHours = (dailyPoints) => {
        if (dailyPoints.length < 2 || !userSettings) {
            return { balance: 0, worked: 0, required: 0, totalTimeGross: 0 };
        }
        
        const standardWorkdayMinutes = userSettings.dailyStandardHours * 60; // Horas salvas * 60
        
        const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        
        const pontoEntrada = new Date(sortedPoints[0].timestamp_ponto);
        const pontoSaida = new Date(sortedPoints[sortedPoints.length - 1].timestamp_ponto);
        
        let totalTimeGross = (pontoSaida.getTime() - pontoEntrada.getTime()) / (1000 * 60);

        if (totalTimeGross < 0) totalTimeGross = 0;
        
        // DEDUÇÃO FIXA DA HORA DE ALMOÇO (1 hora = 60 minutos)
        const lunchBreakMinutes = 60; 
        
        const effectiveWorkedMinutes = totalTimeGross - lunchBreakMinutes; 
        
        const balance = effectiveWorkedMinutes - standardWorkdayMinutes;

        return {
            balance,
            worked: effectiveWorkedMinutes, 
            required: standardWorkdayMinutes,
            totalTimeGross,
        };
    };

    // Função para formatar minutos para "+Xh Ym" ou "-Xh Ym"
    const formatDuration = (minutes) => {
        const sign = minutes >= 0 ? '+' : '-';
        const absoluteMinutes = Math.abs(minutes);
        const hours = Math.floor(absoluteMinutes / 60);
        const mins = absoluteMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    // Função principal para processar os pontos
    const processPoints = (pointsList) => {
        if (!userSettings) return [];

        const grouped = {};
        pointsList.forEach(point => {
            const date = point.workday_date; 
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(point);
        });

        const summary = Object.keys(grouped).map(date => {
            const dailyStats = calculateDailyHours(grouped[date]);
            
            const dateParts = date.split('/').map(Number); 
            const sortableDate = `${dateParts[2]}-${String(dateParts[1]).padStart(2, '0')}-${String(dateParts[0]).padStart(2, '0')}`;

            return {
                date,
                sortableDate,
                points: grouped[date], 
                ...dailyStats
            };
        });

        summary.sort((a, b) => b.sortableDate.localeCompare(a.sortableDate));

        return summary;
    };

    // Efeito para carregar as configurações
    useEffect(() => {
        const fetchSettings = async () => {
            const settings = await loadUserSettings();
            setUserSettings(settings);
        };
        fetchSettings();
    }, []);

    // Efeito para carregar os pontos
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
                orderBy('workday_date', 'desc'),
                orderBy('timestamp_ponto', 'desc')
            );

            const unsubscribe = onSnapshot(
                q,
                (querySnapshot) => {
                    const pointsData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setPoints(pointsData);
                    setLoading(false);
                },
                (error) => {
                    console.error("Erro ao carregar pontos: ", error);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        }, [userSettings])
    );

    // Efeito para filtrar e processar os dados
    useEffect(() => {
        if (!userSettings || points.length === 0) {
            setDailySummary([]);
            return;
        }

        const filteredByMonth = points.filter(point => {
            const pointDateParts = point.workday_date.split('/').map(p => parseInt(p, 10));
            return pointDateParts[1] === selectedMonth && pointDateParts[2] === selectedYear;
        });
        
        const summary = processPoints(filteredByMonth);
        setDailySummary(summary);
    }, [points, selectedMonth, selectedYear, userSettings]);


    if (loading || !userSettings) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a148c" />
                <Text style={{ marginTop: 10, color: '#4a148c' }}>Carregando dados e configurações...</Text>
            </SafeAreaView>
        );
    }

    // Componente de Item da Lista
    const renderItem = ({ item }) => {
        const balanceStyle = item.balance >= 0 ? styles.balancePositive : styles.balanceNegative;
        
        // CORREÇÃO APLICADA AQUI: Mapeia usando o timestamp_ponto e a função formatTime
        const pointsDetail = item.points
            .sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto))
            .map(p => formatTime(p.timestamp_ponto))
            .join(' | ');

        // Tempo Bruto formatado
        const grossMinutes = item.totalTimeGross;
        const grossHours = Math.floor(grossMinutes / 60);
        const grossMins = grossMinutes % 60;
        const grossTime = `${grossHours}h ${grossMins}m`;

        // Tempo Efetivo trabalhado formatado
        const workedMinutes = item.worked;
        const workedHours = Math.floor(workedMinutes / 60);
        const workedMins = workedMinutes % 60;
        const workedTime = `${workedHours}h ${workedMins}m`;


        return (
            <View style={styles.itemContainer}>
                <View style={styles.dateAndBalance}>
                    <Text style={styles.itemDate}>{item.date}</Text>
                    <Text style={[styles.itemBalance, balanceStyle]}>{formatDuration(item.balance)}</Text>
                </View>
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Pontos:</Text> {pointsDetail}
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Jornada Bruta:</Text> {grossTime} (Deduzido 1h Almoço)
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Trab. Efetivo:</Text> {workedTime} (Req. {userSettings.dailyStandardHours}h)
                    </Text>
                    {item.points.length < 2 && (
                        <Text style={styles.warningText}>
                            Atenção: Apenas {item.points.length} ponto(s) registrado(s). Saldo zerado.
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Relatório Detalhado</Text>
            
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

            <Text style={styles.infoText}>
                Jornada Padrão: {userSettings.dailyStandardHours} horas. (1ª Entrada e Última Saída - 1h Almoço)
            </Text>

            <FlatList
                data={dailySummary}
                keyExtractor={(item) => item.date}
                renderItem={renderItem}
                ListEmptyComponent={() => (
                    <Text style={styles.emptyListText}>
                        Nenhum registro de ponto encontrado para {months.find(m => m.value === selectedMonth).label}/{selectedYear}.
                    </Text>
                )}
                contentContainerStyle={styles.listContent}
            />
            
            <AdBannerPlaceholder />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 5,
        elevation: 1,
    },
    picker: {
        height: 50,
        width: '45%',
    },
    infoText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
        fontSize: 14,
        paddingHorizontal: 10,
    },
    itemContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    dateAndBalance: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    itemDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4a148c',
    },
    itemBalance: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    balancePositive: {
        color: '#4CAF50', // Verde
    },
    balanceNegative: {
        color: '#F44336', // Vermelho
    },
    detailsContainer: {
        paddingTop: 5,
    },
    detailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    label: {
        fontWeight: 'bold',
    },
    warningText: {
        fontSize: 13,
        color: '#FF9800', // Laranja de aviso
        marginTop: 5,
        fontStyle: 'italic',
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#888',
    },
});

export default ReportScreen;