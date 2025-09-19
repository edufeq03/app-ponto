// services/pdfService.js
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Gera e compartilha um relatório de pontos em formato PDF.
 * @param {Array} summaryData - Os dados de resumo diário.
 * @param {Date} startDate - A data de início do período.
 * @param {Date} endDate - A data de fim do período.
 * @param {number} totalHours - O total de horas trabalhadas no período.
 */
export const generateAndSharePdf = async (summaryData, startDate, endDate, totalHours) => {
  try {
    // 1. Constrói o conteúdo HTML da tabela
    const tableRows = summaryData.map(item => {
      const entrada1 = item.ponto1 ? formatTime(item.ponto1.timestamp_ponto) : '-';
      const saida1 = item.ponto2 ? formatTime(item.ponto2.timestamp_ponto) : '-';
      const entrada2 = item.ponto3 ? formatTime(item.ponto3.timestamp_ponto) : '-';
      const saida2 = item.ponto4 ? formatTime(item.ponto4.timestamp_ponto) : '-';

      return `
        <tr>
          <td>${item.date}</td>
          <td>${entrada1}</td>
          <td>${saida1}</td>
          <td>${entrada2}</td>
          <td>${saida2}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <h1>Relatório de Pontos</h1>
      <h2>Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</h2>
      
      <style>
        body { font-family: sans-serif; }
        h1, h2 { text-align: center; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
        .total-row { font-weight: bold; background-color: #e6e6e6; }
      </style>
      
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Entrada 1</th>
            <th>Saída 1</th>
            <th>Entrada 2</th>
            <th>Saída 2</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <p class="total-row">Total de Horas: ${totalHours.toFixed(2)}</p>
    `;

    // 2. Converte o HTML em PDF
    const options = {
      html: htmlContent,
      fileName: `relatorio-ponto-${startDate.toLocaleDateString('pt-BR').replace(/\//g, '-')}_a_${endDate.toLocaleDateString('pt-BR').replace(/\//g, '-')}`,
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    const fileUri = `file://${file.filePath}`;

    // 3. Compartilha o arquivo
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Erro", "A funcionalidade de compartilhamento não está disponível neste dispositivo.");
      return;
    }

    await Sharing.shareAsync(fileUri);
    return true;

  } catch (error) {
    console.error("Erro ao gerar ou compartilhar o PDF:", error);
    Alert.alert("Erro", "Não foi possível gerar o arquivo para download.");
    return false;
  }
};