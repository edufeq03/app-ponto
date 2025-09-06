import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase_config';

const CURRENT_USER_NAME = "EDUARDO TARGINE CAPELLA";

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

export default function ReportScreen() {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    // FUNÇÃO QUE BUSCA OS PONTOS DO FIRESTORE
    const fetchPoints = async () => {
        setLoading(true);
        try {
            const pontosCollection = collection(db, 'pontos');
            const q = query(pontosCollection);
            const querySnapshot = await getDocs(q);
            const pointsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Organiza os pontos por data e hora
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

    // FUNÇÃO PARA AGRUPAR OS PONTOS POR DIA DE TRABALHO
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

    // LÓGICA DO CÁLCULO DO BANCO DE HORAS
    const calculateTimeBank = () => {
        const workdayHours = 8; // **IMPORTANTE: Precisamos de sua confirmação para este valor**
        let totalMinutesWorked = 0;
        let totalMinutesRequired = 0;

        Object.keys(groupedPoints).forEach(date => {
            const dailyPoints = groupedPoints[date];
            if (dailyPoints.length >= 2) {
                // Simplificação: Assume o primeiro e o último ponto como entrada e saída
                const firstPointTime = dailyPoints[0].time;
                const lastPointTime = dailyPoints[dailyPoints.length - 1].time;
                const { hours, minutes } = calculateHourDifference(firstPointTime, lastPointTime);
                totalMinutesWorked += hours * 60 + minutes;
            }
            totalMinutesRequired += workdayHours * 60;
        });

        const bankMinutes = totalMinutesWorked - totalMinutesRequired;
        const sign = bankMinutes >= 0 ? "+" : "-";
        const absBankMinutes = Math.abs(bankMinutes);
        const bankHours = Math.floor(absBankMinutes / 60);
        const bankMins = absBankMinutes % 60;

        return `${sign}${bankHours}h ${bankMins}m`;
    };

    const timeBank = calculateTimeBank();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    // Exibe a lista de pontos agrupados por dia
    const renderItem = ({ item }) => {
        const date = item[0];
        const dailyPoints = item[1];
        
        let totalDailyMinutes = 0;
        if (dailyPoints.length >= 2) {
            const firstPointTime = dailyPoints[0].time;
            const lastPointTime = dailyPoints[dailyPoints.length - 1].time;
            const { hours, minutes } = calculateHourDifference(firstPointTime, lastPointTime);
            totalDailyMinutes = hours * 60 + minutes;
        }

        const dailyHours = Math.floor(totalDailyMinutes / 60);
        const dailyMinutes = totalDailyMinutes % 60;
        const dailyHoursText = `${dailyHours}h ${dailyMinutes}m`;

        return (
            <View style={styles.dayContainer}>
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
            <Text style={styles.screenTitle}>Resumo do Ponto</Text>
            <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Banco de Horas:</Text>
                <Text style={styles.timeBankText}>{timeBank}</Text>
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
        color: '#007AFF',
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