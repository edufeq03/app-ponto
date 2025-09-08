import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const SummaryScreen = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const calculateTotalHours = (ponto1, ponto2, ponto3, ponto4) => {
      let totalTime = 0;
      let lastPoint = null;
      let firstPoint = null;

      if (ponto1) firstPoint = new Date(ponto1.timestamp_ponto);
      if (ponto4) lastPoint = new Date(ponto4.timestamp_ponto);
      
      if (firstPoint && lastPoint) {
        totalTime += lastPoint.getTime() - firstPoint.getTime();
      }

      // Se houverem apenas 2 pontos, calcula a diferença entre eles
      if (ponto1 && ponto2 && !ponto3 && !ponto4) {
        totalTime = new Date(ponto2.timestamp_ponto).getTime() - new Date(ponto1.timestamp_ponto).getTime();
      }

      if (totalTime > 0) {
        return (totalTime / (1000 * 60 * 60)).toFixed(2);
      }
      return '0.00';
    };


    const renderTimeCell = (pointData) => {
        if (!pointData) {
            return <Text style={[styles.tableCell, styles.col]}>-</Text>;
        }

        const cellStyles = [styles.tableCell, styles.col];
        const textStyles = [];

        if (pointData.origem === 'manual') {
            cellStyles.push(styles.manualCell);
        }
        if (pointData.isOvernight) {
            textStyles.push(styles.overnightCellText);
        }
        if (pointData.isEdited) {
            textStyles.push(styles.editedCellText);
        }
        if (pointData.justificativa) {
            textStyles.push(styles.justificationCellText);
        }

        return (
            <Text style={[...cellStyles, ...textStyles]}>
                {formatTime(pointData.timestamp_ponto)}
                {pointData.isEdited && ' *'}
                {pointData.justificativa && ' J'}
            </Text>
        );
    };

    const handleDownload = async () => {
        if (summary.length === 0) {
            Alert.alert("Aviso", "Não há dados para download neste mês.");
            return;
        }
    
        // 1. Formatar os dados para CSV
        const header = "Data,Entrada 1,Saída 1,Entrada 2,Saída 2,Horas Totais\n";
        const csvContent = summary.map(item => {
            const date = item.date;
            const entrada1 = item.ponto1 ? formatTime(item.ponto1.timestamp_ponto) : '';
            const saida1 = item.ponto2 ? formatTime(item.ponto2.timestamp_ponto) : '';
            const entrada2 = item.ponto3 ? formatTime(item.ponto3.timestamp_ponto) : '';
            const saida2 = item.ponto4 ? formatTime(item.ponto4.timestamp_ponto) : '';
            const totalHours = calculateTotalHours(item.ponto1, item.ponto2, item.ponto3, item.ponto4);
            return `${date},${entrada1},${saida1},${entrada2},${saida2},${totalHours}`;
        }).join('\n');
    
        const fullCsvContent = header + csvContent;
        const filename = `relatorio-ponto-${new Date().getMonth() + 1}-${new Date().getFullYear()}.csv`;
        const fileUri = FileSystem.cacheDirectory + filename;
    
        try {
            await FileSystem.writeAsStringAsync(fileUri, fullCsvContent);
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Erro", "A funcionalidade de compartilhamento não está disponível neste dispositivo.");
                return;
            }
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error("Erro ao criar ou compartilhar o arquivo:", error);
            Alert.alert("Erro", "Não foi possível gerar o arquivo para download.");
        }
    };
    
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            setSummary([]);
            Alert.alert("Aviso", "Usuário não autenticado. Nenhum resumo para exibir.");
            return;
        }

        const q = query(
            collection(db, 'pontos'),
            where('usuario_id', '==', user.uid),
            orderBy('timestamp_ponto', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pointsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const groupedByDay = pointsData.reduce((acc, point) => {
                const date = new Date(point.timestamp_ponto).toLocaleDateString('pt-BR');
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(point);
                return acc;
            }, {});

            const dailySummary = Object.entries(groupedByDay).map(([date, points]) => {
                const sortedPoints = points.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
                const dailyData = {
                    date,
                    ponto1: sortedPoints[0] || null,
                    ponto2: sortedPoints[1] || null,
                    ponto3: sortedPoints[2] || null,
                    ponto4: sortedPoints[3] || null,
                    isComplete: sortedPoints.length >= 4,
                };
                return dailyData;
            });

            setSummary(dailySummary);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao carregar os dados:", error);
            setLoading(false);
            Alert.alert("Erro", "Não foi possível carregar o resumo mensal.");
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Resumo Mensal</Text>
                <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
                    <Ionicons name="download-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>
            <Text style={styles.legend}>Células cinzas: Ponto manual. * = Editado. J = Com justificativa.</Text>
            
            <View style={styles.table}>
                <View style={styles.tableRowHeader}>
                    <Text style={[styles.tableHeader, styles.dateCol]}>Data</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Entrada</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Saída</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Retorno</Text>
                    <Text style={[styles.tableHeader, styles.col]}>Saída</Text>
                </View>
                <FlatList
                    data={summary}
                    keyExtractor={(item) => item.date}
                    renderItem={({ item }) => (
                        <View style={[styles.tableRow, !item.isComplete && styles.incompleteRow]}>
                            <Text style={[styles.tableCell, styles.dateCol]}>{item.date}</Text>
                            {renderTimeCell(item.ponto1)}
                            {renderTimeCell(item.ponto2)}
                            {renderTimeCell(item.ponto3)}
                            {renderTimeCell(item.ponto4)}
                        </View>
                    )}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    downloadButton: {
        padding: 5,
    },
    legend: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        marginBottom: 10,
        fontStyle: 'italic',
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
        flex: 1.5,
    },
    col: {
        flex: 1,
    },
    incompleteRow: {
        backgroundColor: '#FFFBEA',
    },
    manualCell: {
        backgroundColor: '#E0E0E0',
    },
    overnightCellText: {
        fontWeight: 'bold',
        color: '#007AFF',
    },
    editedCellText: {
        fontWeight: 'bold',
        color: 'red',
    },
    justificationCellText: {
        fontWeight: 'bold',
        color: 'purple',
    },
});

export default SummaryScreen;