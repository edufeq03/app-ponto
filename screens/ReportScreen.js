import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, SafeAreaView, Alert, Modal, TextInput, Button, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { collection, query, getDocs, addDoc, where, orderBy } from 'firebase/firestore';
import { db, auth } from './config/firebase_config'; // Importe 'auth'
import DateTimePicker from '@react-native-community/datetimepicker';

// Define a jornada de trabalho padrão (8 horas) e os limites dos breaks
const DAILY_WORK_HOURS = 8;
const REQUIRED_DAILY_POINTS = 4;
const SHORT_BREAK_THRESHOLD_MINUTES = 50;
const LONG_BREAK_THRESHOLD_MINUTES = 65;

// Função utilitária para converter HH:MM em minutos totais
const timeToMinutes = (time) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Função utilitária para calcular a diferença de tempo em minutos entre dois horários HH:MM
const calculateMinuteDifference = (start, end) => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    let diff = endMinutes - startMinutes;
    if (diff < 0) {
        diff += 24 * 60;
    }
    return diff;
};

// Formata minutos totais para o formato "Xh Ym"
const formatDuration = (minutes) => {
    const sign = minutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(minutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const mins = absoluteMinutes % 60;
    return `${sign}${hours}h ${mins}m`;
};

// Formata minutos totais para o formato "HH:mm"
const formatMinutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}`;
};


const ReportScreen = () => {
    const [points, setPoints] = useState([]);
    const [saques, setSaques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalHours, setTotalHours] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [saqueAmount, setSaqueAmount] = useState('');
    const [saqueDate, setSaqueDate] = useState(new Date());
    const [saqueJustification, setSaqueJustification] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || saqueDate;
        setShowDatePicker(Platform.OS === 'ios');
        setSaqueDate(currentDate);
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    // Função para calcular o banco de horas
    const calculateTimeBank = (points, saques) => {
        if (points.length < REQUIRED_DAILY_POINTS) {
            return { balance: 0, dailyBalances: [], totalWorkedMinutes: 0 };
        }
        
        const DAILY_WORK_MINUTES = DAILY_WORK_HOURS * 60;
        let totalBalanceMinutes = 0;
        let dailyBalances = [];

        const groupedByDay = points.reduce((acc, point) => {
            const date = new Date(point.timestamp_ponto).toLocaleDateString('pt-BR');
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(point);
            return acc;
        }, {});

        Object.entries(groupedByDay).forEach(([date, dailyPoints]) => {
            const sortedPoints = dailyPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
            if (sortedPoints.length >= REQUIRED_DAILY_POINTS) {
                let workedMinutes = 0;
                let breakMinutes = 0;

                // Jornada 1
                const entry1 = new Date(sortedPoints[0].timestamp_ponto);
                const exit1 = new Date(sortedPoints[1].timestamp_ponto);
                workedMinutes += Math.abs(exit1 - entry1) / (1000 * 60);

                // Jornada 2
                const entry2 = new Date(sortedPoints[2].timestamp_ponto);
                const exit2 = new Date(sortedPoints[3].timestamp_ponto);
                workedMinutes += Math.abs(exit2 - entry2) / (1000 * 60);

                // Intervalo de almoço
                const breakStart = new Date(sortedPoints[1].timestamp_ponto);
                const breakEnd = new Date(sortedPoints[2].timestamp_ponto);
                breakMinutes = Math.abs(breakEnd - breakStart) / (1000 * 60);

                const dailyBalance = workedMinutes - DAILY_WORK_MINUTES;
                totalBalanceMinutes += dailyBalance;
                
                dailyBalances.push({
                    date: date,
                    worked: workedMinutes,
                    balance: dailyBalance,
                    details: [
                        `Jornada 1: ${formatMinutesToTime(workedMinutes)}`,
                        `Intervalo: ${Math.round(breakMinutes)} min`
                    ]
                });
            } else {
                dailyBalances.push({
                    date: date,
                    worked: 0,
                    balance: -DAILY_WORK_MINUTES,
                    details: ["Pontos insuficientes para cálculo"]
                });
                totalBalanceMinutes -= DAILY_WORK_MINUTES;
            }
        });
        
        // Subtrair saques
        saques.forEach(saque => {
            totalBalanceMinutes -= saque.quantidade_minutos;
        });

        return { balance: totalBalanceMinutes, dailyBalances };
    };

    // Função para adicionar saque
    const addSaqueHoras = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado. Faça login para registrar o saque.");
            return;
        }

        const saqueValue = parseInt(saqueAmount, 10);
        if (isNaN(saqueValue) || saqueValue <= 0) {
            Alert.alert("Erro", "Por favor, insira um valor válido para o saque.");
            return;
        }

        try {
            await addDoc(collection(db, 'saques'), {
                quantidade_minutos: saqueValue,
                data_saque: saqueDate.toISOString(),
                justificativa: saqueJustification,
                usuario_id: user.uid, // Salvando o UID do usuário
            });
            Alert.alert("Sucesso", "Saque de horas registrado com sucesso!");
            setModalVisible(false);
            setSaqueAmount('');
            setSaqueJustification('');
        } catch (error) {
            console.error("Erro ao registrar saque:", error);
            Alert.alert("Erro", "Não foi possível registrar o saque.");
        }
    };
    

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            setPoints([]);
            setSaques([]);
            Alert.alert("Aviso", "Usuário não autenticado. Nenhum banco de horas para exibir.");
            return;
        }

        const fetchAllData = async () => {
            try {
                // Altera a query para filtrar os pontos pelo UID do usuário
                const pointsQuery = query(
                    collection(db, 'pontos'),
                    where('usuario_id', '==', user.uid),
                    orderBy('timestamp_ponto')
                );
                const pointsSnapshot = await getDocs(pointsQuery);
                const fetchedPoints = pointsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPoints(fetchedPoints);

                // Altera a query para filtrar os saques pelo UID do usuário
                const saquesQuery = query(
                    collection(db, 'saques'),
                    where('usuario_id', '==', user.uid),
                    orderBy('data_saque', 'desc')
                );
                const saquesSnapshot = await getDocs(saquesQuery);
                const fetchedSaques = saquesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSaques(fetchedSaques);
                
            } catch (error) {
                console.error("Erro ao carregar dados do banco de horas:", error);
                Alert.alert("Erro", "Não foi possível carregar os dados.");
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                fetchAllData();
            } else {
                setLoading(false);
                setPoints([]);
                setSaques([]);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading) {
            const { balance } = calculateTimeBank(points, saques);
            setTotalHours(balance);
        }
    }, [points, saques, loading]);

    const dailyBalances = calculateTimeBank(points, saques).dailyBalances;
    const saquesList = saques.map(saque => ({
        ...saque,
        formattedDate: new Date(saque.data_saque).toLocaleDateString('pt-BR'),
        formattedAmount: formatDuration(-saque.quantidade_minutos)
    }));


    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.container}>
                <Text style={styles.header}>Banco de Horas</Text>

                <View style={[styles.totalBalance, totalHours >= 0 ? styles.positiveTotal : styles.negativeTotal]}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>Saldo Total: {formatDuration(totalHours)}</Text>
                </View>
                
                <Text style={styles.sectionTitle}>Balanço Diário</Text>
                {/* Removemos o ScrollView para evitar conflito com a FlatList */}
                <FlatList
                    data={dailyBalances}
                    keyExtractor={item => item.date}
                    renderItem={({ item }) => (
                        <View style={styles.dailyItem}>
                            <Text style={styles.dailyDate}>{item.date}</Text>
                            <View style={styles.dailyDetails}>
                                <Text style={[styles.dailyBalance, item.balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                                    {formatDuration(item.balance)}
                                </Text>
                            </View>
                        </View>
                    )}
                />
                
                <Text style={styles.sectionTitle}>Saques Registrados</Text>
                <FlatList
                    data={saquesList}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.saqueItem}>
                            <Text style={styles.saqueDate}>Data: {item.formattedDate}</Text>
                            <Text style={styles.saqueTotal}>Valor: {item.formattedAmount}</Text>
                            <Text style={styles.saqueJustificativa}>Justificativa: {item.justificativa}</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Nenhum saque registrado.</Text>}
                />

                <Button title="Registrar Saque de Horas" onPress={() => setModalVisible(true)} />

            {/* Modal para Registrar Saque de Horas */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registrar Saque de Horas</Text>
                        
                        <Text style={styles.formLabel}>Data do Saque:</Text>
                        {Platform.OS === 'ios' ? (
                            <DateTimePicker
                                value={saqueDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        ) : (
                            <TouchableOpacity onPress={showDatepicker} style={styles.dateInputButton}>
                                <Text style={styles.dateInputText}>{saqueDate.toLocaleDateString('pt-BR')}</Text>
                            </TouchableOpacity>
                        )}
                        {showDatePicker && Platform.OS === 'android' && (
                            <DateTimePicker
                                value={saqueDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )}

                        <Text style={styles.formLabel}>Quantidade (minutos):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 30, 60, 120"
                            keyboardType="numeric"
                            value={saqueAmount}
                            onChangeText={setSaqueAmount}
                        />

                        <Text style={styles.formLabel}>Justificativa:</Text>
                        <TextInput
                            style={[styles.input, { height: 100 }]}
                            multiline
                            numberOfLines={4}
                            value={saqueJustification}
                            onChangeText={setSaqueJustification}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 }}>
                            <Button title="Confirmar" onPress={addSaqueHoras} />
                            <Button title="Cancelar" onPress={() => setModalVisible(false)} color="red" />
                        </View>
                    </View>
                </View>
            </Modal>
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
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
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
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    negativeBalance: {
        color: '#F44336',
        fontWeight: 'bold',
    },
    // Estilos do saque
    saqueItem: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#E0F2F1',
        borderRadius: 8,
    },
    saqueDate: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 5,
    },
    saqueTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00796B',
        marginBottom: 5,
    },
    saqueJustificativa: {
        fontSize: 14,
        color: '#424242',
    },
    // Estilos do Modal
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    formLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    dateInputButton: {
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    dateInputText: {
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
});

export default ReportScreen;