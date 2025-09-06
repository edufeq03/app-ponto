import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase_config';

// Define a jornada de trabalho padrão (8 horas)
const DAILY_WORK_HOURS = 8;
const REQUIRED_DAILY_POINTS = 4; // Agora, exigimos 4 marcações por dia

// Função utilitária para calcular a diferença de horas entre dois horários (formato HH:MM)
const calculateHourDifference = (start, end) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startDate = new Date(0, 0, 0, startHour, startMinute);
    const endDate = new Date(0, 0, 0, endHour, endMinute);
    let diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) { // Lida com o caso em que o ponto vira a noite
        diff += 24 * 60 * 60 * 1000;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
};

// Formata minutos totais para o formato "Xh Ym"
const formatMinutesToHours = (totalMinutes) => {
    const sign = totalMinutes >= 0 ? "" : "-";
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${sign}${hours}h ${minutes}m`;
};

export default function ReportScreen() {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPoints = async () => {
        setLoading(true);
        try {
            const pontosCollection = collection(db, 'pontos');
            const q = query(pontosCollection);
            const querySnapshot = await getDocs(q);
            
            // FILTRO DE SEGURANÇA: Garante que só vamos processar documentos completos
            const pointsList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => doc.workday_date && doc.time); // **AQUI ESTÁ A CORREÇÃO**

            pointsList.sort((a, b) => {
                const dateA = new Date(a.workday_date.split('/').reverse().join('-') + 'T' + a.time);
                const dateB = new Date(b.workday_date.split('/').reverse().join('-') + 'T' + b.time);
                return dateA - dateB;
            });

            setPoints(pointsList);
        } catch (e) {
            console.error("Erro ao buscar os documentos: ", e);
            Alert.alert("Erro", "Não foi possível carregar os registros de ponto.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPoints();
    }, []);

    const groupPointsByWorkday = (points) => {
        const grouped = {};
        points.forEach(point => {
            const date = point.workday_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(point);
        });
        return grouped;
    };

    const groupedPoints = groupPointsByWorkday(points);
    const daysWithIncompletePoints = Object.values(groupedPoints).some(
        (dailyPoints) => dailyPoints.length < REQUIRED_DAILY_POINTS
    );

    const calculateTimeBank = () => {
        let totalMinutesWorked = 0;
        let totalMinutesRequired = 0;

        Object.keys(groupedPoints).forEach(date => {
            const dailyPoints = groupedPoints[date];
            // Apenas calcula a jornada para dias com os pontos completos
            if (dailyPoints.length >= REQUIRED_DAILY_POINTS) {
                const firstPointTime = dailyPoints[0].time;
                const lastPointTime = dailyPoints[dailyPoints.length - 1].time;
                const { hours, minutes } = calculateHourDifference(firstPointTime, lastPointTime);
                totalMinutesWorked += (hours * 60) + minutes;
                totalMinutesRequired += DAILY_WORK_HOURS * 60;
            }
        });

        const bankMinutes = totalMinutesWorked - totalMinutesRequired;
        return bankMinutes;
    };

    const timeBankInMinutes = calculateTimeBank();
    const formattedTimeBank = formatMinutesToHours(timeBankInMinutes);
    const timeBankColor = timeBankInMinutes >= 0 ? '#4CAF50' : '#F44336';

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando registros...</Text>
            </SafeAreaView>
        );
    }

    const renderItem = ({ item }) => {
        const date = item[0];
        const dailyPoints = item[1];
        
        const isComplete = dailyPoints.length >= REQUIRED_DAILY_POINTS;
        let dailyHoursText = "Dados Incompletos";
        
        if (isComplete) {
            const firstPointTime = dailyPoints[0].time;
            const lastPointTime = dailyPoints[dailyPoints.length - 1].time;
            const { hours, minutes } = calculateHourDifference(firstPointTime, lastPointTime);
            const totalDailyMinutes = (hours * 60) + minutes;
            dailyHoursText = formatMinutesToHours(totalDailyMinutes);
        }

        return (
            <View style={[styles.dayContainer, !isComplete && styles.incompleteDay]}>
                <Text style={styles.dateHeader}>{date}</Text>
                <Text style={styles.totalDailyHours}>Jornada: {dailyHoursText}</Text>
                {dailyPoints.map((point, index) => (
                    <View key={index} style={styles.pointItem}>
                        <Text style={styles.pointTime}>{point.time}</Text>
                        <Text style={styles.pointDetail}>{point.origem === 'foto' ? 'Registro por foto' : 'Registro manual'}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.screenTitle}>Relatório do Banco de Horas</Text>
            <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total de Horas</Text>
                {daysWithIncompletePoints ? (
                    <Text style={styles.incompleteMessage}>
                        É necessário registrar as 4 marcações ou justificar as faltas para visualizar seu banco de horas.
                    </Text>
                ) : (
                    <Text style={[styles.timeBankText, { color: timeBankColor }]}>{formattedTimeBank}</Text>
                )}
            </View>
            <FlatList
                data={Object.entries(groupedPoints)}
                renderItem={renderItem}
                keyExtractor={item => item[0]}
                style={styles.list}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 20,
    },
    summaryBox: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#666',
    },
    timeBankText: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    incompleteMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: '#FF9800', // Laranja para indicar que é um aviso/tarefa
        fontWeight: 'bold',
    },
    list: {
        width: '100%',
    },
    dayContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 10,
        marginBottom: 10,
        padding: 15,
        borderRadius: 10,
        elevation: 1,
    },
    incompleteDay: {
        borderColor: '#FF9800',
        borderWidth: 2,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    totalDailyHours: {
        fontSize: 14,
        color: '#999',
        marginBottom: 10,
    },
    pointItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pointTime: {
        fontSize: 16,
        fontWeight: '500',
    },
    pointDetail: {
        fontSize: 14,
        color: '#666',
    },
});