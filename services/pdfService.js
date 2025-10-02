// services/pdfService.js
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// import RNHTMLtoPDF from 'react-native-html-to-pdf'; // <--- COMENTADO: Desabilitado temporariamente devido a erro nativo

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes) => {
    const sign = minutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${sign}${hours}h ${mins}m`;
};


/**
 * Gera e compartilha um relatório de pontos em formato PDF.
 * A função está temporariamente desabilitada para contornar um erro nativo.
 * @param {Array} dailySummary - Os dados de resumo diário (inclui worked, balance, rawPoints).
 * @param {Date} startDate - A data de início do período.
 * @param {Date} endDate - A data de fim do período.
 * @param {number} totalBalance - O total de horas no banco de horas.
 */
export const generateAndSharePdf = async (dailySummary, startDate, endDate, totalBalance) => {
    // INÍCIO DO CÓDIGO TEMPORÁRIO PARA DESABILITAR O PDF
    Alert.alert(
        "Em Desenvolvimento",
        "Estamos desenvolvendo essa funcionalidade. Por favor, aguarde!"
    );
    console.log("PDF MOCK: Função generateAndSharePdf chamada e desabilitada.");
    return true; // Simula sucesso para não travar a tela
    // FIM DO CÓDIGO TEMPORÁRIO PARA DESABILITAR O PDF

    /* PARA REATIVAR O PDF:
    1. Descomente a linha 'import RNHTMLtoPDF' acima.
    2. Remova todo o código entre os comentários INÍCIO/FIM.
    3. Descomente o bloco try/catch original:
    
    try {
        // 1. Constrói o conteúdo HTML da tabela...
        // ... (código original do PDF)
    } catch (error) {
        // ...
        return false;
    }
    */
};