// src/services/timeService.js

/**
 * Calcula o total de horas trabalhadas de acordo com as novas regras de negócio.
 * Regras:
 * 1. O cálculo só ocorre se houver 2 ou mais marcações (Entrada e Saída).
 * 2. O tempo é calculado apenas entre o PRIMEIRO e o ÚLTIMO ponto do dia.
 * @param {Array<Object>} points - Uma lista de objetos de ponto em ordem cronológica.
 * @returns {string} O total de horas trabalhadas formatado com duas casas decimais.
 */
export const calculateTotalHours = (points) => {
    // MUDANÇA AQUI: Regra 1: Considera apenas dias com 2 ou mais marcações
    if (points.length < 2) {
        return '0.00';
    }

    // Ordena os pontos cronologicamente (se já não estiverem) para garantir que
    // o primeiro e o último sejam a Entrada e a Saída.
    const sortedPoints = points.sort((a, b) => new Date(a.timestamp_ponto) - new Date(b.timestamp_ponto));
    
    // MUDANÇA AQUI: Pega apenas o PRIMEIRO e o ÚLTIMO ponto (Entrada e Saída)
    const pontoEntrada = new Date(sortedPoints[0].timestamp_ponto);
    const pontoSaida = new Date(sortedPoints[sortedPoints.length - 1].timestamp_ponto);

    // MUDANÇA AQUI: Calcula o tempo total de expediente
    let totalTime = pontoSaida.getTime() - pontoEntrada.getTime();

    // 2. A lógica de desconto de almoço foi REMOVIDA
    
    // 3. Converte de milissegundos para horas e formata
    if (totalTime > 0) {
        const totalHours = totalTime / (1000 * 60 * 60);
        return totalHours.toFixed(2);
    }
    
    return '0.00';
};