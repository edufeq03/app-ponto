// services/cameraService.js
import { findDocumentBoundingBox, analyzeImage, extractDataFromText } from './visionService';
import { savePointData, checkIfDuplicate } from './firebaseService';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Função principal para processar a imagem tirada com a câmera.
 * @param {string} imageUri - O URI local da imagem.
 * @returns {object} Os dados extraídos da imagem e o texto original.
 */
export const processImage = async (imageUri) => {
  console.log("DEBUG: Processando imagem da câmera...");
  try {
    const croppedImage = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }], // Redimensiona para uma largura menor para otimizar
      { compress: 0.7, format: SaveFormat.JPEG, base64: true }
    );
    
    // Passo 1: Analisar a imagem com a API Vision
    const detectedText = await analyzeImage(croppedImage.base64);
    
    // Passo 2: Extrair dados específicos do texto
    const extractedData = extractDataFromText(detectedText);

    return {
      originalText: detectedText,
      extractedData: { ...extractedData, photoUri: imageUri } // Adiciona o URI original para o upload
    };
  } catch (error) {
    console.error("ERRO: Falha ao processar a imagem:", error);
    return { originalText: "Falha ao processar a imagem. Tente novamente.", extractedData: {} };
  }
};

// Exporte as outras funções para uso direto se necessário
export { findDocumentBoundingBox, savePointData, checkIfDuplicate };