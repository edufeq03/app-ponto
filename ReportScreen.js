import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase_config';

// Define a jornada de trabalho padrão (8 horas) e os limites dos breaks
const DAILY_WORK_HOURS = 7;
const REQUIRED_DAILY_POINTS = 4;
const SHORT_BREAK_THRESHOLD_MINUTES = 50;
const LONG_BREAK_THRESHOLD_MINUTES = 65;

// Função utilitária para converter HH:MM em minutos totais
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Função utilitária para calcular a diferença de tempo em minutos entre dois horários HH:MM
const calculateMinuteDifference = (start, end) => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    let diff = endMinutes - startMinutes;
    if (diff < 0) { // Lida com o caso em que o ponto vira a noite
        diff += 24 * 60;
    }
    return diff;
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
            
            const pointsList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => doc.workday_date && doc.time);

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

    // Nova função para calcular a jornada diária e o status do break
    const calculateDailySummary = (dailyPoints) => {
        let totalDailyMinutes = 0;
        let breakStatus = 'normal'; // Pode ser 'short' ou 'long'

        if (dailyPoints.length >= REQUIRED_DAILY_POINTS) {
            // As 4 marcações estão presentes
            const firstIn = dailyPoints[0].time;
            const breakOut = dailyPoints[1].time;
            const breakIn = dailyPoints[2].time;
            const lastOut = dailyPoints[3].time;

            const workPart1 = calculateMinuteDifference(firstIn, breakOut);
            const workPart2 = calculateMinuteDifference(breakIn, lastOut);
            const breakDuration = calculateMinuteDifference(breakOut, breakIn);

            totalDailyMinutes = workPart1 + workPart2;

            if (breakDuration < SHORT_BREAK_THRESHOLD_MINUTES) {
                breakStatus = 'short';
            } else if (breakDuration > LONG_BREAK_THRESHOLD_MINUTES) {
                breakStatus = 'long';
                const extraBreakMinutes = breakDuration - LONG_BREAK_THRESHOLD_MINUTES;
                totalDailyMinutes -= extraBreakMinutes; // Desconta do total
            }
        }
        return { totalDailyMinutes, breakStatus };
    };

    const calculateTimeBank = () => {
        let totalMinutesWorked = 0;
        let totalMinutesRequired = 0;

        Object.keys(groupedPoints).forEach(date => {
            const dailyPoints = groupedPoints[date];
            if (dailyPoints.length >= REQUIRED_DAILY_POINTS) {
                const { totalDailyMinutes } = calculateDailySummary(dailyPoints);
                totalMinutesWorked += totalDailyMinutes;
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
        let statusStyle = styles.normalStatus;
        
        if (isComplete) {
            const { totalDailyMinutes, breakStatus } = calculateDailySummary(dailyPoints);
            dailyHoursText = formatMinutesToHours(totalDailyMinutes);
            if (breakStatus === 'short') {
                statusStyle = styles.shortBreakStatus;
            } else if (breakStatus === 'long') {
                statusStyle = styles.longBreakStatus;
            }
        }

        return (
            <View style={[styles.dayContainer, !isComplete && styles.incompleteDay]}>
                <Text style={styles.dateHeader}>{date}</Text>
                <Text style={[styles.totalDailyHours, statusStyle]}>Jornada: {dailyHoursText}</Text>
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
                        É necessário registrar as 4 marcações para visualizar seu banco de horas.
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
        fontWeight: 'bold',
        marginBottom: 10,
    },
    normalStatus: {
        color: '#999',
    },
    shortBreakStatus: {
        color: '#03A9F4', // Azul claro para aviso de break curto
    },
    longBreakStatus: {
        color: '#F44336', // Vermelho para penalidade de break longo
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