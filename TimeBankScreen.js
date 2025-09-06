import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase_config';

const TimeBankScreen = () => {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);

    const formatDuration = (minutes) => {
        const sign = minutes >= 0 ? '+' : '-';
        const absoluteMinutes = Math.abs(minutes);
        const hours = Math.floor(absoluteMinutes / 60);
        const mins = absoluteMinutes % 60;
        return `${sign}${hours}h ${mins}m`;
    };

    const calculateDailyHours = (dailyPoints) => {
        if (dailyPoints.length < 2) return { balance: -480, worked: 0, required: 480, details: [] };

        const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        const details = [];
        let totalWorkedMinutes = 0;

        for (let i = 0; i < sortedPoints.length; i += 2) {
            if (sortedPoints[i + 1]) {
                const start = new Date(sortedPoints[i].timestamp_ponto);
                const end = new Date(sortedPoints[i + 1].timestamp_ponto);
                const durationInMinutes = (end - start) / (1000 * 60);
                totalWorkedMinutes += durationInMinutes;
                details.push({
                    start: sortedPoints[i].time,
                    end: sortedPoints[i + 1].time,
                    duration: durationInMinutes,
                });
            }
        }

        const standardWorkdayMinutes = 8 * 60;
        const balance = totalWorkedMinutes - standardWorkdayMinutes;

        return {
            balance,
            worked: totalWorkedMinutes,
            required: standardWorkdayMinutes,
            details,
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
        setTotalHours(accumulatedBalance);
        return dailySummary;
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
                const dailyData = processPointsForBank(pointsData);
                setPoints(dailyData);
                setLoading(false);
            },
            (error) => {
                console.error("Erro ao carregar pontos: ", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.dailyItem}>
            <Text style={styles.dailyDate}>{item.date}</Text>
            <View style={styles.dailyDetails}>
                <Text>Jornada: {formatDuration(item.worked)}</Text>
                <Text style={item.balance >= 0 ? styles.positiveBalance : styles.negativeBalance}>
                    Saldo: {formatDuration(item.balance)}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Banco de Horas</Text>
            <Text style={[styles.totalBalance, totalHours >= 0 ? styles.positiveTotal : styles.negativeTotal]}>
                Saldo Total: {formatDuration(totalHours)}
            </Text>
            <FlatList
                data={points}
                keyExtractor={(item) => item.date}
                renderItem={renderItem}
                ListEmptyComponent={() => (
                    <Text style={styles.noDataText}>Nenhum ponto registrado.</Text>
                )}
            />
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
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    totalBalance: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        padding: 10,
        borderRadius: 8,
    },
    positiveTotal: {
        color: '#fff',
        backgroundColor: '#4CAF50',
    },
    negativeTotal: {
        color: '#fff',
        backgroundColor: '#F44336',
    },
    dailyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dailyDate: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    dailyDetails: {
        flex: 2,
        alignItems: 'flex-end',
    },
    positiveBalance: {
        color: 'green',
        fontWeight: 'bold',
    },
    negativeBalance: {
        color: 'red',
        fontWeight: 'bold',
    },
    noDataText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#888',
    },
});

export default TimeBankScreen;