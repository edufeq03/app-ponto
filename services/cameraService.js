// services/cameraService.js
import axios from 'axios';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';
import { db, storage, auth } from '../config/firebase_config';

/**
 * Encontra a caixa delimitadora (bounding box) do texto na imagem usando a API Vision.
 * @param {string} base64Image - A imagem em formato base64.
 * @returns {object|null} A caixa delimitadora com originX, originY, width, height ou null se não for encontrada.
 */
const findDocumentBoundingBox = async (base64Image) => {
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
    
    // Calcula a bounding box que engloba todas as palavras detectadas
    words.forEach(word => {
        word.boundingPoly.vertices.forEach(vertex => {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
        });
    });

    return {
      originX: minX,
      originY: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  } catch (error) {
    console.error("Erro ao encontrar a caixa delimitadora do documento:", error);
    return null;
  }
};

/**
 * Envia a imagem para a Google Vision API para análise de texto.
 * @param {string} base64Image - A imagem cortada em formato base64.
 * @returns {string|null} O texto completo detectado na imagem ou null em caso de erro.
 */
const analyzeImage = async (base64Image) => {
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
        const textAnnotations = response.data.responses[0]?.textAnnotations;
        return textAnnotations && textAnnotations.length > 0 ? textAnnotations[0].description : null;
    } catch (error) {
        console.error("Erro na análise da imagem:", error);
        return null;
    }
};

/**
 * Extrai os dados de ponto do texto completo do comprovante.
 * @param {string} fullText - O texto completo extraído do comprovante.
 * @returns {object} Um objeto com os dados extraídos (nome, data, hora, etc.).
 */
const extractDataFromText = (fullText) => {
  const data = {};

  const nameMatch = fullText.match(/NOME\s+(.+?)\nPIS:/s);
  if (nameMatch && nameMatch[1]) data.name = nameMatch[1].trim();

  const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch && dateMatch[1]) data.date = dateMatch[1].trim();

  const timeMatch = fullText.match(/(\d{2}:\d{2})/);
  if (timeMatch && timeMatch[1]) data.time = timeMatch[1].trim();

  return data;
};

/**
 * Verifica se um comprovante com os mesmos dados já existe no Firestore.
 * @param {object} data - Os dados a serem verificados (data, hora, nome).
 * @returns {Promise<boolean>} Verdadeiro se for uma duplicata, falso caso contrário.
 */
const checkIfDuplicate = async (data) => {
  const q = query(
    collection(db, 'pontos'),
    where('name', '==', data.name),
    where('date', '==', data.date),
    where('time', '==', data.time)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

/**
 * Salva a imagem no Firebase Storage e registra o ponto no Firestore.
 * @param {string} photoUri - URI da foto local a ser enviada.
 * @param {object} pointData - Os dados do ponto a serem salvos no Firestore.
 * @returns {Promise<boolean>} Verdadeiro se o salvamento for bem-sucedido, falso caso contrário.
 */
const savePointData = async (photoUri, pointData) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("ERRO: Usuário não autenticado.");
    return false;
  }

  try {
    // 1. Upload da imagem para o Firebase Storage
    const imageRef = ref(storage, `pontos_imagens/${user.uid}/${Date.now()}.jpg`);
    const response = await fetch(photoUri);
    const blob = await response.blob();
    await uploadBytes(imageRef, blob);
    const imageUrl = await getDownloadURL(imageRef);

    // 2. Registro do ponto no Firestore com a URL da imagem
    const finalPointData = {
      ...pointData,
      image_url: imageUrl,
      usuario_id: user.uid,
    };
    
    await addDoc(collection(db, 'pontos'), finalPointData);
    
    // 3. Salvar o nome lido na coleção de leituras
    await addDoc(collection(db, 'leituras_nome'), {
      usuario_id: user.uid,
      nome_lido: pointData.name,
      timestamp: new Date(),
    });

    console.log("DEBUG: Dados de ponto e nome salvos com sucesso!");
    return true;
  } catch (error) {
    console.error("ERRO: Falha ao salvar os dados:", error);
    return false;
  }
};

/**
 * Encontra o nome mais frequente entre as leituras do usuário.
 * @param {string} uid - O UID do usuário logado.
 * @returns {Promise<string|null>} O nome mais frequente ou null se não houver dados.
 */
const findMostFrequentName = async (uid) => {
    if (!uid) return null;

    try {
        const q = query(
            collection(db, 'leituras_nome'),
            where('usuario_id', '==', uid)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }
        
        const namesCount = {};
        let totalReadings = 0;

        querySnapshot.forEach(doc => {
            const name = doc.data().nome_lido.trim().toUpperCase();
            if (name) {
                namesCount[name] = (namesCount[name] || 0) + 1;
                totalReadings++;
            }
        });

        // Se tiver menos de 5 leituras, não retorna um nome de referência
        if (totalReadings < 5) {
            return null; 
        }

        let mostFrequentName = null;
        let maxCount = 0;
        
        for (const name in namesCount) {
            if (namesCount[name] > maxCount) {
                maxCount = namesCount[name];
                mostFrequentName = name;
            }
        }
        
        return mostFrequentName;
        
    } catch (error) {
        console.error("Erro ao encontrar o nome mais frequente:", error);
        return null;
    }
};

/**
 * Função principal para processar a imagem do comprovante.
 * @param {string} imageUri - O URI da imagem tirada.
 * @returns {object} Os dados extraídos da imagem.
 */
const processImage = async (imageUri) => {
    // 1. Encontra a bounding box do texto
    const tempImageResponse = await manipulateAsync(imageUri, [], { compress: 1, format: SaveFormat.JPEG, base64: true });
    const boundingBox = await findDocumentBoundingBox(tempImageResponse.base64);

    let croppedImageUri = imageUri;
    if (boundingBox) {
        const croppedImage = await manipulateAsync(
            imageUri,
            [{ crop: boundingBox }],
            { compress: 1, format: SaveFormat.JPEG, base64: true }
        );
        croppedImageUri = croppedImage.uri;
    }

    // 2. Analisa o texto da imagem cortada
    const croppedImageResponse = await manipulateAsync(croppedImageUri, [], { compress: 1, format: SaveFormat.JPEG, base64: true });
    const detectedText = await analyzeImage(croppedImageResponse.base64);
    const extractedData = extractDataFromText(detectedText);

    return {
        originalText: detectedText,
        extractedData,
    };
};

// Exportando as funções que a tela da câmera usará
export {
    findDocumentBoundingBox,
    analyzeImage,
    extractDataFromText,
    checkIfDuplicate,
    savePointData,
    findMostFrequentName,
    processImage
};