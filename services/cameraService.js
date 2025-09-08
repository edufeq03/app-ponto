import axios from 'axios';
import { collection, addDoc, query, where, getDocs, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';
import { db, storage, auth } from '../config/firebase_config';

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
  // Expressão regular ajustada para capturar 'NOME' ou 'OME' e variações.
  const nameRegex = /(NOME|OME|NOME:)\s*([A-Z\s]+?)\n/i;
  const nameMatch = text.match(nameRegex);
  if (nameMatch && nameMatch[2]) {
    data.name = nameMatch[2].trim();
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

/**
 * Verifica se um registro de ponto já existe no Firestore.
 * @param {object} data - Os dados do ponto a ser verificado.
 * @returns {boolean} True se for um duplicado, false caso contrário.
 */
export const checkIfDuplicate = async (data) => {
  console.log("DEBUG: Verificando duplicidade para:", data.name, data.date, data.time);
  const pontosRef = collection(db, 'pontos');
  const q = query(
    pontosRef,
    where('name', '==', data.name),
    where('date', '==', data.date),
    where('time', '==', data.time)
  );
  const querySnapshot = await getDocs(q);
  const isDuplicate = !querySnapshot.empty;
  console.log("DEBUG: Duplicidade verificada. É um duplicado?", isDuplicate);
  return isDuplicate;
};

/**
 * Faz o upload de uma imagem para o Firebase Storage.
 * @param {string} uri - O URI local da imagem.
 * @returns {string|null} A URL de download da imagem ou null em caso de falha.
 */
export const uploadImage = async (uri) => {
  console.log("DEBUG: Iniciando upload da imagem para o Firebase Storage...");
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `comprovantes/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    console.log("DEBUG: Imagem enviada para o Firebase Storage:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("ERRO: Falha ao enviar a imagem:", error);
    return null;
  }
};

/**
 * Envia os dados do ponto para o Firestore.
 * @param {object} data - Os dados do ponto a serem salvos.
 * @param {string} photoURL - A URL da imagem no Storage.
 * @param {string} justification - A justificativa para a diferença no nome, se houver.
 * @returns {boolean} True se o salvamento for bem-sucedido, false caso contrário.
 */
export const sendToFirestore = async (data, photoURL, justification = null) => {
  console.log("DEBUG: Enviando dados para o Firestore...");
  const user = auth.currentUser;
  if (!user) {
    console.error("ERRO: Usuário não autenticado.");
    return false;
  }
  try {
    const pontosCollection = collection(db, 'pontos');
    const [day, month, year] = data.date.split('/').map(Number);
    const [hours, minutes] = data.time.split(':').map(Number);
    const pointDateTime = new Date(year, month - 1, day, hours, minutes);
    let workdayDate = new Date(pointDateTime);
    if (hours >= 0 && hours < 6) {
      workdayDate.setDate(workdayDate.getDate() - 1);
    }
    await addDoc(pontosCollection, {
      ...data,
      timestamp_salvo: new Date().toISOString(),
      timestamp_ponto: pointDateTime.toISOString(),
      url_foto: photoURL,
      origem: 'foto',
      workday_date: workdayDate.toLocaleDateString('pt-BR'),
      name_from_ocr: data.name,
      justificativa_nome: justification,
      usuario_id: user.uid,
    });
    console.log("DEBUG: Dados enviados para o Firestore com sucesso!");
    return true;
  } catch (error) {
    console.error("ERRO: Falha ao enviar dados para o Firestore:", error);
    return false;
  }
};

/**
 * Busca o nome de perfil do usuário no Firestore.
 * @returns {Promise<string|null>} O nome de perfil do usuário ou null se não existir.
 */
export const getUserProfileName = async () => {
  const user = auth.currentUser;
  if (!user) {
      console.error("ERRO: Usuário não autenticado.");
      return null;
  }
  const userDocRef = doc(db, 'userProfiles', user.uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
      return userDoc.data().name;
  }
  return null;
};

/**
 * Salva o nome de perfil do usuário no Firestore.
 * @param {string} name - O nome do usuário.
 * @returns {Promise<boolean>} Verdadeiro se o nome for salvo com sucesso, falso caso contrário.
 */
export const saveUserProfileName = async (name) => {
  const user = auth.currentUser;
  if (!user) {
      console.error("ERRO: Usuário não autenticado.");
      return false;
  }
  try {
      const userDocRef = doc(db, 'userProfiles', user.uid);
      await setDoc(userDocRef, { name });
      console.log("Nome de perfil do usuário salvo com sucesso.");
      return true;
  } catch (error) {
      console.error("ERRO: Falha ao salvar o nome de perfil do usuário:", error);
      return false;
  }
};

/**
 * Limpa todos os registros de pontos do usuário logado.
 * Esta função deve ser usada APENAS para desenvolvimento.
 * @returns {Promise<boolean>} Verdadeiro se a limpeza for bem-sucedida, falso caso contrário.
 */
export const clearAllPoints = async () => {
    console.log("LOG: Iniciando a limpeza de todos os pontos do usuário para desenvolvimento...");
    const user = auth.currentUser;
    if (!user) {
        console.error("ERRO: Usuário não autenticado.");
        return false;
    }

    try {
        const pontosRef = collection(db, 'pontos');
        const q = query(pontosRef, where('usuario_id', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("LOG: Nenhumn ponto encontrado para o usuário. Nenhuma limpeza necessária.");
            return true;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(docSnapshot => {
            batch.delete(doc(db, 'pontos', docSnapshot.id));
        });

        await batch.commit();
        console.log(`LOG: ${querySnapshot.size} pontos deletados com sucesso.`);
        return true;
    } catch (error) {
        console.error("ERRO: Falha ao limpar os pontos:", error);
        return false;
    }
};