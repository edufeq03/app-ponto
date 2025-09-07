import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, SafeAreaView, Alert, Modal, TextInput, Button, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase_config';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define a jornada de trabalho padrão (8 horas) e os limites dos breaks
const DAILY_WORK_HOURS = 8;
const REQUIRED_DAILY_POINTS = 4;
const SHORT_BREAK_THRESHOLD_MINUTES = 50;
const LONG_BREAK_THRESHOLD_MINUTES = 65;

// NO FUTURO: Este nome virá de um sistema de autenticação
const CURRENT_USER_NAME = "EDUARDO TARGINE CAPELLA";

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
const formatMinutesToHours = (totalMinutes) => {
    const sign = totalMinutes >= 0 ? "" : "-";
    const absMinutes = Math.abs(totalMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${sign}${hours}h ${minutes}m`;
};

// Função utilitária para criar um objeto Date a partir de DD/MM/AAAA e HH:MM
const parseDate = (dateStr, timeStr = '00:00') => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
};

// Formata um objeto Date para DD/MM/AAAA
const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function ReportScreen() {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
    const [hoursToWithdraw, setHoursToWithdraw] = useState('');
    const [justification, setJustification] = useState('');
    const [withdrawDate, setWithdrawDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Mova a lógica de cálculo para o início da função
    const timeBankInMinutes = calculateTimeBank();
    const formattedTimeBank = formatMinutesToHours(timeBankInMinutes);
    const timeBankColor = timeBankInMinutes >= 0 ? '#4CAF50' : '#F44336';

    const fetchPoints = async () => {
        setLoading(true);
        try {
            const pontosCollection = collection(db, 'pontos');
            const q = query(pontosCollection);
            const querySnapshot = await getDocs(q);

            const pointsList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(doc => (doc.origem === 'saque' && doc.data_saque) || (doc.origem !== 'saque' && doc.workday_date && doc.time));

            pointsList.sort((a, b) => {
                const dateA = a.origem === 'saque' ? parseDate(a.data_saque) : parseDate(a.workday_date, a.time);
                const dateB = b.origem === 'saque' ? parseDate(b.data_saque) : parseDate(b.workday_date, b.time);

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
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
            const date = point.workday_date || point.data_saque;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(point);
        });
        return grouped;
    };

    const groupedPoints = groupPointsByWorkday(points);
    const daysWithIncompletePoints = Object.values(groupedPoints).some(
        (dailyPoints) => dailyPoints.length >= 1 && dailyPoints.some(p => p.origem !== 'saque' && dailyPoints.filter(p => p.origem !== 'saque').length < REQUIRED_DAILY_POINTS)
    );

    const calculateDailySummary = (dailyPoints) => {
        let totalDailyMinutes = 0;
        let breakStatus = 'normal';
        let isSaque = false;

        const regularPoints = dailyPoints.filter(p => p.origem !== 'saque');
        const saquePoints = dailyPoints.filter(p => p.origem === 'saque'); // Mudança aqui

        if (regularPoints.length >= REQUIRED_DAILY_POINTS) {
            const firstIn = regularPoints[0].time;
            const breakOut = regularPoints[1].time;
            const breakIn = regularPoints[2].time;
            const lastOut = regularPoints[3].time;

            const workPart1 = calculateMinuteDifference(firstIn, breakOut);
            const workPart2 = calculateMinuteDifference(breakIn, lastOut);
            const breakDuration = calculateMinuteDifference(breakOut, breakIn);

            totalDailyMinutes = workPart1 + workPart2;

            if (breakDuration < SHORT_BREAK_THRESHOLD_MINUTES) {
                breakStatus = 'short';
            } else if (breakDuration > LONG_BREAK_THRESHOLD_MINUTES) {
                breakStatus = 'long';
                const extraBreakMinutes = breakDuration - LONG_BREAK_THRESHOLD_MINUTES;
                totalDailyMinutes -= extraBreakMinutes;
            }
        }

        if (saquePoints.length > 0) { // Mudança aqui
            isSaque = true;
            saquePoints.forEach(saquePoint => {
                totalDailyMinutes += saquePoint.minutos_saque;
            });
        }

        return { totalDailyMinutes, breakStatus, isSaque };
    };

    const calculateTimeBank = () => {
        let totalMinutesWorked = 0;
        let totalMinutesRequired = 0;

        Object.keys(groupedPoints).forEach(date => {
            const dailyPoints = groupedPoints[date];
            const regularPoints = dailyPoints.filter(p => p.origem !== 'saque');

            if (regularPoints.length >= REQUIRED_DAILY_POINTS || dailyPoints.some(p => p.origem === 'saque')) {
                const { totalDailyMinutes, isSaque } = calculateDailySummary(dailyPoints);
                totalMinutesWorked += totalDailyMinutes;
                if (!isSaque || regularPoints.length > 0) {
                    totalMinutesRequired += DAILY_WORK_HOURS * 60;
                }
            }
        });

        const bankMinutes = totalMinutesWorked - totalMinutesRequired;
        return bankMinutes;
    };

    const handleWithdraw = async () => {
        if (!hoursToWithdraw || !justification) {
            Alert.alert("Erro", "Por favor, preencha todos os campos.");
            return;
        }

        const inputDate = withdrawDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate > today) {
            Alert.alert("Erro", "Não é possível sacar horas para uma data futura.");
            return;
        }

        const totalMinutes = parseInt(hoursToWithdraw, 10) * 60 * -1;

        if (isNaN(totalMinutes)) {
            Alert.alert("Erro", "Formato de horas inválido.");
            return;
        }

        try {
            await addDoc(collection(db, 'pontos'), {
                name: CURRENT_USER_NAME,
                data_saque: formatDate(inputDate),
                justificativa_saque: justification,
                minutos_saque: totalMinutes,
                origem: 'saque',
                timestamp_saque: new Date().toISOString(),
            });
            setWithdrawModalVisible(false);
            setHoursToWithdraw('');
            setJustification('');
            setWithdrawDate(new Date());
            Alert.alert("Sucesso!", `Saque de ${hoursToWithdraw} horas registrado com sucesso.`);
            fetchPoints();
        } catch (e) {
            console.error("Erro ao registrar o saque: ", e);
            Alert.alert("Erro", "Falha ao registrar o saque. Tente novamente.");
        }
    };

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
        const isSaqueDay = dailyPoints.some(p => p.origem === 'saque');

        if (isSaqueDay) {
            const saquePoints = dailyPoints.filter(p => p.origem === 'saque'); // Mudança aqui
            const regularPoints = dailyPoints.filter(p => p.origem !== 'saque');
            const hasOtherEntries = regularPoints.length > 0;

            return (
                <View style={[styles.dayContainer, styles.saqueContainer]}>
                    <Text style={styles.dateHeader}>{date}</Text>
                    {saquePoints.map((saquePoint) => (
                        <View key={saquePoint.id} style={styles.saqueItem}>
                            <Text style={styles.saqueTotal}>Saque de Horas: {formatMinutesToHours(saquePoint.minutos_saque)}</Text>
                            <Text style={styles.saqueJustificativa}>Motivo: {saquePoint.justificativa_saque}</Text>
                        </View>
                    ))}
                    {hasOtherEntries && (
                        <>
                            <Text style={styles.dateHeader}>Jornada do dia:</Text>
                            {regularPoints.map((point, index) => (
                                <View key={index} style={styles.pointItem}>
                                    <Text style={styles.pointTime}>{point.time}</Text>
                                    <Text style={styles.pointDetail}>{point.origem === 'foto' ? 'Registro por foto' : 'Registro manual'}</Text>
                                </View>
                            ))}
                        </>
                    )}
                </View>
            );
        }

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
                <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Total de Horas</Text>
                    {daysWithIncompletePoints ? (
                        <Text style={styles.incompleteMessage}>
                            É necessário registrar as 4 marcações para visualizar seu banco de horas.
                        </Text>
                    ) : (
                        <Text style={[styles.timeBankText, { color: timeBankColor }]}>{formattedTimeBank}</Text>
                    )}
                </View>
                <TouchableOpacity style={styles.withdrawButton} onPress={() => setWithdrawModalVisible(true)}>
                    <Text style={styles.withdrawButtonText}>Sacar Horas</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={Object.entries(groupedPoints)}
                renderItem={renderItem}
                keyExtractor={item => item[0]}
                style={styles.list}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={withdrawModalVisible}
                onRequestClose={() => setWithdrawModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Registrar Saque de Horas</Text>

                        <Text style={styles.formLabel}>Data do Saque:</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInputButton}>
                            <Text style={styles.dateInputText}>{formatDate(withdrawDate)}</Text>
                        </TouchableOpacity>
                        
                        {showDatePicker && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={withdrawDate}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (selectedDate) {
                                        setWithdrawDate(selectedDate);
                                    }
                                }}
                            />
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Horas a Sacar (ex: 2)"
                            value={hoursToWithdraw}
                            onChangeText={setHoursToWithdraw}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Justificativa (ex: Folga para consulta)"
                            value={justification}
                            onChangeText={setJustification}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <Button title="Cancelar" onPress={() => setWithdrawModalVisible(false)} color="#666" />
                            <Button title="Confirmar Saque" onPress={handleWithdraw} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
        textAlign: 'center',
    },
    summaryBox: {
        width: '90%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryContent: {
        alignItems: 'center',
        flex: 1,
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
        color: '#FF9800',
        fontWeight: 'bold',
    },
    withdrawButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    withdrawButtonText: {
        color: '#fff',
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
        color: '#03A9F4',
    },
    longBreakStatus: {
        color: '#F44336',
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
    saqueContainer: {
        backgroundColor: '#E0F2F1',
        borderColor: '#00BFA5',
        borderWidth: 1,
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
    saqueItem: {
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#B2DFDB',
        paddingBottom: 5,
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
        fontSize: 16,
        marginBottom: 15,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
});