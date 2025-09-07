import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db, auth } from './firebase_config'; // Importe 'auth'

const { width } = Dimensions.get('window');

const SummaryScreen = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    /**
     * Função auxiliar para renderizar uma célula da tabela com a lógica de estilo.
     */
    const renderTimeCell = (pointData) => {
        if (!pointData) {
            return <Text style={[styles.tableCell, styles.col]}>-</Text>;
        }

        const cellStyles = [styles.tableCell, styles.col];
        const textStyles = [];

        // Adiciona o estilo de fundo manual
        if (pointData.origem === 'manual') {
            cellStyles.push(styles.manualCell);
        }

        // Adiciona a cor de texto noturna
        if (pointData.isOvernight) {
            textStyles.push(styles.overnightCellText);
        }

        // Adiciona a cor de texto editada
        if (pointData.isEdited) {
            textStyles.push(styles.editedCellText);
        }
        
        // Adiciona a cor de texto da justificativa
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
    
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            setSummary([]);
            Alert.alert("Aviso", "Usuário não autenticado. Nenhum resumo para exibir.");
            return;
        }

        // Altera a query para filtrar pelo UID do usuário logado
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
            <Text style={styles.header}>Resumo Mensal</Text>
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