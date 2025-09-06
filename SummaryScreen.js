import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase_config';

const SummaryScreen = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const processPoints = (points) => {
        const dailySummary = {};
        
        // Agrupar pontos por workday_date (a nova lógica)
        points.forEach(point => {
            if (!point.workday_date) return;
            const date = point.workday_date;
            if (!dailySummary[date]) {
                dailySummary[date] = [];
            }
            dailySummary[date].push(point);
        });

        const sortedDates = Object.keys(dailySummary).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/').map(Number);
            const [dayB, monthB, yearB] = b.split('/').map(Number);
            return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
        });

        const finalSummary = sortedDates.map(date => {
            const pointsForDay = dailySummary[date];
            pointsForDay.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));

            const times = {};
            if (pointsForDay[0]) {
                times.entrada1 = {
                    time: formatTime(pointsForDay[0].timestamp_ponto),
                    origem: pointsForDay[0].origem,
                    isOvernight: pointsForDay[0].date !== pointsForDay[0].workday_date,
                    isEdited: pointsForDay[0].editado
                };
            }
            if (pointsForDay[1]) {
                times.saida1 = {
                    time: formatTime(pointsForDay[1].timestamp_ponto),
                    origem: pointsForDay[1].origem,
                    isOvernight: pointsForDay[1].date !== pointsForDay[1].workday_date,
                    isEdited: pointsForDay[1].editado
                };
            }
            if (pointsForDay[2]) {
                times.entrada2 = {
                    time: formatTime(pointsForDay[2].timestamp_ponto),
                    origem: pointsForDay[2].origem,
                    isOvernight: pointsForDay[2].date !== pointsForDay[2].workday_date,
                    isEdited: pointsForDay[2].editado
                };
            }
            if (pointsForDay[3]) {
                times.saida2 = {
                    time: formatTime(pointsForDay[3].timestamp_ponto),
                    origem: pointsForDay[3].origem,
                    isOvernight: pointsForDay[3].date !== pointsForDay[3].workday_date,
                    isEdited: pointsForDay[3].editado
                };
            }

            return {
                id: date,
                date: date,
                times
            };
        });

        setSummary(finalSummary);
        setLoading(false);
    };

    useEffect(() => {
        const q = query(collection(db, 'pontos'), orderBy('workday_date', 'desc'), orderBy('timestamp_ponto', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedPoints = [];
            querySnapshot.forEach((doc) => {
                fetchedPoints.push({ id: doc.id, ...doc.data() });
            });
            processPoints(fetchedPoints);
        }, (error) => {
            console.error("Erro ao carregar pontos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Preparando resumo...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Text style={styles.header}>Resumo Mensal</Text>
            <Text style={styles.legend}>
                <Text style={styles.manualCellText}>Fundo amarelo:</Text> ponto inserido manualmente.{"\n"}
                <Text style={styles.overnightCellText}>Texto azul:</Text> ponto noturno (após a meia-noite).{"\n"}
                <Text style={styles.editedCellText}>Texto vermelho:</Text> ponto editado após a leitura da foto.
            </Text>
            <View style={styles.table}>
                <View style={styles.tableRowHeader}>
                    <Text style={[styles.tableHeader, styles.dateCol]}>Dia</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Entrada</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Saída</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Entrada 2</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Saída 2</Text>
                </View>
                <FlatList
                    data={summary}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.dateCol]}>{item.date}</Text>
                            <Text style={[styles.tableCell, styles.col, item.times.entrada1?.origem === 'manual' && styles.manualCell, item.times.entrada1?.isEdited && styles.editedCellText, item.times.entrada1?.isOvernight && styles.overnightCell]}>{item.times.entrada1?.time || '-'}</Text>
                            <Text style={[styles.tableCell, styles.col, item.times.saida1?.origem === 'manual' && styles.manualCell, item.times.saida1?.isEdited && styles.editedCellText, item.times.saida1?.isOvernight && styles.overnightCell]}>{item.times.saida1?.time || '-'}</Text>
                            <Text style={[styles.tableCell, styles.col, item.times.entrada2?.origem === 'manual' && styles.manualCell, item.times.entrada2?.isEdited && styles.editedCellText, item.times.entrada2?.isOvernight && styles.overnightCell]}>{item.times.entrada2?.time || '-'}</Text>
                            <Text style={[styles.tableCell, styles.col, item.times.saida2?.origem === 'manual' && styles.manualCell, item.times.saida2?.isEdited && styles.editedCellText, item.times.saida2?.isOvernight && styles.overnightCell]}>{item.times.saida2?.time || '-'}</Text>
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 20,
        textAlign: 'center',
        color: '#333',
    },
    legend: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    manualCellText: {
        fontWeight: 'bold',
        color: '#555',
    },
    overnightCellText: {
        fontWeight: 'bold',
        color: '#007AFF', // Azul para a legenda
    },
    editedCellText: {
        fontWeight: 'bold',
        color: 'red', // Vermelho para a legenda
    },
    table: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    tableRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    tableHeader: {
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 10,
    },
    tableCell: {
        textAlign: 'center',
        paddingVertical: 10,
        borderRightWidth: 1,
        borderColor: '#eee',
    },
    dateCol: {
        flex: 2,
    },
    col: {
        flex: 1,
    },
    manualCell: {
        backgroundColor: '#FFFACD',
    },
    overnightCell: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
});

export default SummaryScreen;