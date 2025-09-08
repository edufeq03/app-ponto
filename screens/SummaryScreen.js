import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, Dimensions, Alert, TouchableOpacity, Modal } from 'react-native';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// Importa o novo serviço de cálculo de horas
import { calculateTotalHours } from '../services/timeService';

const { width } = Dimensions.get('window');

const SummaryScreen = () => {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDownloadModalVisible, setDownloadModalVisible] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [datePickerType, setDatePickerType] = useState(null); // 'start' ou 'end'
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [isDownloading, setIsDownloading] = useState(false);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

    const handleDownload = () => {
        setDownloadModalVisible(true);
    };

    const handleConfirmDate = (date) => {
        if (datePickerType === 'start') {
            setStartDate(date);
        } else {
            setEndDate(date);
        }
        setDatePickerVisible(false);
    };

    const handleExportData = async () => {
        setIsDownloading(true);
        setDownloadModalVisible(false);

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado.");
            setIsDownloading(false);
            return;
        }

        if (startDate > endDate) {
            Alert.alert("Erro", "A data de início não pode ser posterior à data de fim.");
            setIsDownloading(false);
            return;
        }

        const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
        const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

        const q = query(
            collection(db, 'pontos'),
            where('usuario_id', '==', user.uid),
            where('timestamp_ponto', '>=', startOfDay.toISOString()),
            where('timestamp_ponto', '<=', endOfDay.toISOString()),
            orderBy('timestamp_ponto', 'desc')
        );

        try {
            const querySnapshot = await getDocs(q);
            const pointsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (pointsData.length === 0) {
                Alert.alert("Aviso", "Nenhum registro encontrado para o período selecionado.");
                setIsDownloading(false);
                return;
            }

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
                return {
                    date,
                    ponto1: sortedPoints[0] || null,
                    ponto2: sortedPoints[1] || null,
                    ponto3: sortedPoints[2] || null,
                    ponto4: sortedPoints[3] || null,
                };
            });

            // Gerar CSV com a nova lógica de cálculo
            const header = "Data,Entrada 1,Saída 1,Entrada 2,Saída 2,Horas Totais\n";
            let totalHoursSum = 0;

            const csvContent = dailySummary.map(item => {
                const entrada1 = item.ponto1 ? formatTime(item.ponto1.timestamp_ponto) : '';
                const saida1 = item.ponto2 ? formatTime(item.ponto2.timestamp_ponto) : '';
                const entrada2 = item.ponto3 ? formatTime(item.ponto3.timestamp_ponto) : '';
                const saida2 = item.ponto4 ? formatTime(item.ponto4.timestamp_ponto) : '';

                const pontosArray = [item.ponto1, item.ponto2, item.ponto3, item.ponto4].filter(Boolean);
                const totalHours = calculateTotalHours(pontosArray);
                
                // Soma as horas para o total geral
                totalHoursSum += parseFloat(totalHours);
                
                return `${item.date},${entrada1},${saida1},${entrada2},${saida2},${totalHours}`;
            }).join('\n');
            
            // Adiciona a linha de total ao final
            const totalRow = `\n\n,Total de Horas,${totalHoursSum.toFixed(2)}`;
            const fullCsvContent = header + csvContent + totalRow;

            const filename = `relatorio-ponto-${startDate.toLocaleDateString('pt-BR').replace(/\//g, '-')}_a_${endDate.toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
            const fileUri = FileSystem.cacheDirectory + filename;

            await FileSystem.writeAsStringAsync(fileUri, fullCsvContent);
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert("Erro", "A funcionalidade de compartilhamento não está disponível neste dispositivo.");
                return;
            }
            await Sharing.shareAsync(fileUri);
        } catch (error) {
            console.error("Erro ao carregar ou gerar o arquivo:", error);
            Alert.alert("Erro", "Não foi possível gerar o arquivo para download.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Efeito para a lista principal (em tempo real)
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
            {/* Modal para seleção de período */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isDownloadModalVisible}
                onRequestClose={() => setDownloadModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Selecione o Período</Text>

                        <View style={styles.datePickerContainer}>
                            <Text>Data de Início:</Text>
                            <TouchableOpacity onPress={() => { setDatePickerType('start'); setDatePickerVisible(true); }}>
                                <Text style={styles.dateText}>{startDate.toLocaleDateString('pt-BR')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.datePickerContainer}>
                            <Text>Data de Fim:</Text>
                            <TouchableOpacity onPress={() => { setDatePickerType('end'); setDatePickerVisible(true); }}>
                                <Text style={styles.dateText}>{endDate.toLocaleDateString('pt-BR')}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.buttonCancel} onPress={() => setDownloadModalVisible(false)}>
                                <Text style={styles.textStyle}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.buttonDownload} onPress={handleExportData}>
                                {isDownloading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.textStyle}>Baixar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisible(false)}
                date={datePickerType === 'start' ? startDate : endDate}
                locale="pt-BR"
            />
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
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    buttonCancel: {
        backgroundColor: "#E0E0E0",
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        width: '45%',
    },
    buttonDownload: {
        backgroundColor: "#007AFF",
        borderRadius: 10,
        padding: 10,
        elevation: 2,
        width: '45%',
        alignItems: 'center',
    },
    textStyle: {
        color: "black",
        fontWeight: "bold",
        textAlign: "center"
    },
});

export default SummaryScreen;