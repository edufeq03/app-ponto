// services/visionService.js
import axios from 'axios';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';

/**
 * Encontra a caixa delimitadora (bounding box) do texto na imagem usando a API Vision.
 * @param {string} base64Image - A imagem em formato base64.
 * @returns {object|null} A caixa delimitadora com originX, originY, width, height ou null se não for encontrada.
 */
export const findDocumentBoundingBox = async (base64Image) => {
  console.log("DEBUG: Tentando encontrar a caixa delimitadora do documento...");
  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION' }],
        }],
      }
    );

    const textAnnotations = response.data.responses[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length <= 1) {
      return null;
    }
    
    const words = textAnnotations.slice(1);
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasValidWord = false;

    words.forEach(word => {
      if (word.boundingPoly && word.boundingPoly.vertices) {
        hasValidWord = true;
        word.boundingPoly.vertices.forEach(vertex => {
          minX = Math.min(minX, vertex.x);
          minY = Math.min(minY, vertex.y);
          maxX = Math.max(maxX, vertex.x);
          maxY = Math.max(maxY, vertex.y);
        });
      }
    });
    
    if (!hasValidWord) {
      return null;
    }

    const margin = 20;
    const boundingBox = {
      originX: Math.max(0, minX - margin),
      originY: Math.max(0, minY - margin),
      width: (maxX - minX) + (2 * margin),
      height: (maxY - minY) + (2 * margin),
    };
    
    return boundingBox;

  } catch (error) {
    console.error('ERRO: Falha ao detectar texto para a caixa delimitadora:', error);
    return null;
  }
};

/**
 * Analisa a imagem para extrair todo o texto do documento.
 * @param {string} base64Image - Imagem em base64.
 * @returns {string} O texto completo extraído ou uma mensagem de erro.
 */
export const analyzeImage = async (base64Image) => {
  console.log("DEBUG: Enviando imagem para a API Vision...");
  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }
    );
    const textFromImage = response.data.responses[0]?.fullTextAnnotation?.text;
    if (textFromImage) {
      console.log("DEBUG: Texto extraído com sucesso.");
    } else {
      console.log("DEBUG: Não foi possível extrair o texto completo.");
    }
    return textFromImage || "Não foi possível detectar texto. Por favor, tente novamente.";
  } catch (error) {
    console.error('ERRO: Falha ao analisar a imagem:', error);
    return "Não foi possível detectar texto. Por favor, tente novamente.";
  }
};

/**
 * Extrai dados específicos (nome, data, hora, etc.) de um texto.
 * @param {string} text - O texto extraído da imagem.
 * @returns {object} Um objeto com os dados extraídos.
 */
export const extractDataFromText = (text) => {
  console.log("DEBUG: Iniciando extração de dados...");
  const data = {};
  const nameRegex = /NOME\s+(.*)/i;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    data.name = nameMatch[1].trim();
  }
  const dateTimeRegex = /(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/;
  const dateTimeMatch = text.match(dateTimeRegex);
  if (dateTimeMatch) {
    data.date = dateTimeMatch[1];
    data.time = dateTimeMatch[2];
  }
  const storeRegex = /LOCAL:\s*(.*)/i;
  const storeMatch = text.match(storeRegex);
  if (storeMatch) {
    data.store = storeMatch[1].trim();
  }
  const authCodeRegex = /PIS:\s*(\d+)/i;
  const authCodeMatch = text.match(authCodeRegex);
  if (authCodeMatch) {
    data.authCode = authCodeMatch[1].trim();
  }
  console.log("DEBUG: Dados extraídos:", data);
  return data;
};