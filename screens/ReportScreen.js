// src/screens/ReportScreen.js
import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { generateAndSharePdf } from '../services/pdfService'; 
import AdBannerPlaceholder from '../components/AdBannerPlaceholder';

// NOVO utilitário para formatar a hora a partir do timestamp ISO
const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString); 
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// NOVO utilitário para formatar a duração (horas e minutos)
const formatDuration = (minutes) => {
    const sign = minutes >= 0 ? '+' : '-';
    const absoluteMinutes = Math.abs(minutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const mins = absoluteMinutes % 60;
    return `${sign}${hours}h ${mins}m`;
};

const ReportScreen = () => {
    const route = useRoute();
    // MUDANÇA AQUI: Recebe os dados e o período via navegação
    const { dailySummary, selectedMonth, selectedYear } = route.params;

    // Calcula o saldo total do período recebido
    const totalBalance = dailySummary.reduce((sum, day) => sum + day.balance, 0);

    const handleSharePDF = async () => {
        // Esta função agora chama o generateAndSharePdf MOCKADO no pdfService.js
        const isPdfShared = await generateAndSharePdf(
            dailySummary, 
            new Date(selectedYear, selectedMonth - 1, 1), 
            new Date(selectedYear, selectedMonth, 0),
            totalBalance
        );
        if (isPdfShared) {
            // Em vez de 'PDF gerado e compartilhado...', o alerta virá do pdfService.js, 
            // mas manteremos o log de sucesso aqui para garantir.
            // alert('A função PDF foi chamada. Verifique o alerta temporário.');
        }
    };

    // Renderiza cada item da lista (cada dia do relatório)
    const renderItem = ({ item }) => {
        const sortedPoints = item.rawPoints.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
        const ponto1 = sortedPoints[0] ? formatTime(sortedPoints[0].timestamp_ponto) : '-';
        const ponto2 = sortedPoints[1] ? formatTime(sortedPoints[1].timestamp_ponto) : '-';
        const ponto3 = sortedPoints[2] ? formatTime(sortedPoints[2].timestamp_ponto) : '-';
        const ponto4 = sortedPoints[3] ? formatTime(sortedPoints[3].timestamp_ponto) : '-';
        
        // A cor do saldo depende se é positivo, negativo ou neutro
        const balanceStyle = item.balance > 0 ? styles.balancePositive : (item.balance < 0 ? styles.balanceNegative : styles.balanceNeutral);
        const isCalculated = item.rawPoints.length >= 4; // Verifica se o dia é elegível para cálculo

        return (
            <View style={styles.itemContainer}>
                <View style={styles.dateAndBalance}>
                    <Text style={styles.itemDate}>{item.date}</Text>
                    <Text style={[styles.itemBalance, balanceStyle]}>
                        {isCalculated ? formatDuration(item.balance) : 'Não calculado'}
                    </Text>
                </View>
                {/* Linha dos pontos para o relatório */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Entrada/Saída: </Text>{ponto1} | {ponto2} | {ponto3} | {ponto4}
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Duração Efetiva: </Text>{isCalculated ? formatDuration(item.worked) : '-'}
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={styles.label}>Jornada Padrão: </Text>{formatDuration(item.required)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Relatório Detalhado</Text>
            <Text style={styles.infoText}>
                Saldo de {months[selectedMonth - 1].label} de {selectedYear}: <Text style={[styles.infoTotalBalance, totalBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>{formatDuration(totalBalance)}</Text>
            </Text>

            {/* Botão de exportar PDF */}
            <TouchableOpacity style={styles.pdfButton} onPress={handleSharePDF}>
                <Ionicons name="share-social-outline" size={24} color="#FFF" />
                <Text style={styles.pdfButtonText}>Exportar PDF (Temporariamente Desabilitado)</Text>
            </TouchableOpacity>

            <FlatList
                data={dailySummary}
                renderItem={renderItem}
                keyExtractor={item => item.date}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
            
            <AdBannerPlaceholder />
        </SafeAreaView>
    );
};

// Estilos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#333',
    },
    infoText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
        fontSize: 16,
        paddingHorizontal: 10,
    },
    infoTotalBalance: {
        fontWeight: 'bold',
    },
    pdfButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4a148c',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 10,
        marginBottom: 15,
    },
    pdfButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    itemContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    dateAndBalance: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 5,
    },
    itemDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4a148c',
    },
    itemBalance: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    balancePositive: {
        color: '#4CAF50', // Verde
    },
    balanceNegative: {
        color: '#F44336', // Vermelho
    },
    balanceNeutral: {
        color: '#555', // Cinza
    },
    detailsContainer: {
        paddingTop: 5,
    },
    detailText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 3,
    },
    label: {
        fontWeight: 'bold',
        color: '#333',
    },
});

const months = [
    { label: 'Janeiro', value: 1 }, { label: 'Fevereiro', value: 2 },
    { label: 'Março', value: 3 }, { label: 'Abril', value: 4 },
    { label: 'Maio', value: 5 }, { label: 'Junho', value: 6 },
    { label: 'Julho', value: 7 }, { label: 'Agosto', value: 8 },
    { label: 'Setembro', value: 9 }, { label: 'Outubro', value: 10 },
    { label: 'Novembro', value: 11 }, { label: 'Dezembro', value: 12 }
];

export default ReportScreen;