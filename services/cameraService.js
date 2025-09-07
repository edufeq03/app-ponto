import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import axios from 'axios';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../api_config';

/**
 * Processa a imagem e a envia para a API do Google Vision.
 * @param {string} imageUri - O URI da imagem capturada.
 * @returns {Promise<string>} O texto detectado pela API.
 */
export const processImageWithVision = async (imageUri) => {
  try {
    // Comprime a imagem para otimizar o envio
    const compressedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: SaveFormat.JPEG, base64: true }
    );

    if (!compressedImage.base64) {
      throw new Error('Falha ao comprimir a imagem ou obter o base64.');
    }

    const apiRequestBody = {
      requests: [{
        image: { content: compressedImage.base64 },
        features: [{ type: 'TEXT_DETECTION' }],
      }],
    };

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      apiRequestBody
    );

    const detectedText = response.data.responses[0].fullTextAnnotation?.text;
    if (!detectedText) {
      console.warn('Nenhum texto detectado pela API do Google Vision.');
      return '';
    }

    return detectedText;
  } catch (error) {
    console.error('Erro na API do Google Vision:', error.response?.data || error.message);
    throw new Error('Erro na API do Google Vision: Network request failed');
  }
};