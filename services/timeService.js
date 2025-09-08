// src/services/timeService.js

/**
 * Calcula o total de horas trabalhadas com base em uma lista de pontos.
 * Esta função pode ser expandida para lidar com regras de negócio mais complexas,
 * como intervalos de almoço e horas extras.
 * * @param {Array<Object>} points - Uma lista de objetos de ponto em ordem cronológica.
 * @returns {string} O total de horas trabalhadas formatado com duas casas decimais.
 */
export const calculateTotalHours = (points) => {
  let totalTime = 0;

  if (points.length < 2) {
    return '0.00';
  }

  // Pega a primeira e a última marcação do dia
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  totalTime = new Date(lastPoint.timestamp_ponto).getTime() - new Date(firstPoint.timestamp_ponto).getTime();
  
  // Se você tiver um cenário de ponto de almoço (4 marcações), pode subtrair o tempo do intervalo
  if (points.length >= 4) {
    const startBreak = new Date(points[1].timestamp_ponto).getTime();
    const endBreak = new Date(points[2].timestamp_ponto).getTime();
    totalTime -= (endBreak - startBreak);
  }

  // Converte de milissegundos para horas
  if (totalTime > 0) {
    return (totalTime / (1000 * 60 * 60)).toFixed(2);
  }
  
  return '0.00';
};