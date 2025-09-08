// src/services/timeService.js

/**
 * Calcula o total de horas trabalhadas de acordo com as regras de negócio.
 * Considera apenas dias com 4 marcações.
 * Desconta o tempo de almoço que exceder 65 minutos.
 * @param {Array<Object>} points - Uma lista de objetos de ponto em ordem cronológica.
 * @returns {string} O total de horas trabalhadas formatado com duas casas decimais.
 */
export const calculateTotalHours = (points) => {
    // 1. Apenas dias com 4 marcações são considerados
    if (points.length !== 4) {
        return '0.00';
    }

    const [ponto1, ponto2, ponto3, ponto4] = points.map(p => new Date(p.timestamp_ponto));

    // 2. Calcula o tempo de trabalho
    const workHoursMorning = ponto2.getTime() - ponto1.getTime(); // Saída 1 - Entrada 1
    const workHoursAfternoon = ponto4.getTime() - ponto3.getTime(); // Saída 2 - Entrada 2
    
    let totalTime = workHoursMorning + workHoursAfternoon;

    // 3. Verifica o intervalo de almoço
    const lunchBreak = ponto3.getTime() - ponto2.getTime(); // Entrada 2 - Saída 1
    const minBreakInMs = 65 * 60 * 1000; // 65 minutos em milissegundos

    if (lunchBreak > minBreakInMs) {
        const excessBreak = lunchBreak - minBreakInMs;
        totalTime -= excessBreak;
    }

    // 4. Converte de milissegundos para horas e formata
    if (totalTime > 0) {
        const totalHours = totalTime / (1000 * 60 * 60);
        return totalHours.toFixed(2);
    }
    
    return '0.00';
};