import axios from 'axios';
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';
import { db, storage, auth } from '../config/firebase_config';

/**
 * Encontra a caixa delimitadora (bounding box) do texto na imagem usando a API Vision.
 * Mantida por convenção, mas não é usada para recorte nesta versão.
 */
export const findDocumentBoundingBox = async (base64Image) => {
  console.log("LOG DEPURAÇÃO BOX: Tentando encontrar a caixa delimitadora do documento...");
  if (!base64Image) return null;

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }]
      }
    );

    const page = response.data.responses[0]?.fullTextAnnotation?.pages[0];
    if (page) {
        return { 
            originX: 0, 
            originY: 0, 
            width: 1, 
            height: 1 
        };
    }

    return null;
  } catch (error) {
    console.error("ERRO: Falha na API Vision para bounding box:", error.response ? error.response.data : error.message);
    return null;
  }
};


/**
 * Executa OCR na imagem para extrair texto.
 * (Com proteção e logs completos)
 */
export const analyzeImage = async (base64Image) => {
    console.log("LOG DEPURAÇÃO OCR: Iniciando análise OCR...");
    if (!base64Image) return '';
    try {
        const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
            {
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'TEXT_DETECTION' }],
                }]
            }
        );

        // CORREÇÃO CRÍTICA: Proteção robusta contra erro 'text' of undefined
        const detectedText = response.data.responses[0]
            ?.fullTextAnnotation
            ?.text || '';

        if (detectedText) {
            console.log("LOG DEPURAÇÃO OCR: OCR detectou texto. Retornando texto.");
            console.log("LOG DEPURAÇÃO OCR: Conteúdo RAW Completo:\n", detectedText); 
        } else {
            console.warn("WARN DEPURAÇÃO OCR: OCR concluído, mas nenhum texto detectado na imagem. Retornando string vazia.");
        }
        
        return detectedText;
        
    } catch (error) {
        console.error("ERRO: Falha na API Vision para OCR:", error.response ? error.response.data : error.message);
        return '';
    }
};

/**
 * Extrai dados estruturados (Nome, Data, Hora) a partir do texto do OCR.
 */
export const extractDataFromText = (text) => {
    const data = {
        name: 'Nome não detectado',
        date: '',
        time: '',
    };
    
    console.log("LOG DEPURAÇÃO EXTRAÇÃO: Texto recebido para extração (Primeiros 100 chars):", text.substring(0, Math.min(text.length, 100)));

    // Expressões regulares
    const nameRegex = /(NOME|FUNCIONÁRIO|COLABORADOR):\s*([^\n\r]+)/i;
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/; 
    const timeRegex = /(\d{2}:\d{2})/g; 

    // Extrair Nome
    const nameMatch = text.match(nameRegex);
    if (nameMatch && nameMatch[2]) {
        data.name = nameMatch[2].trim().toUpperCase();
    } else {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 1) {
            data.name = lines[1].trim().toUpperCase();
        }
    }

    // Extrair Data
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        data.date = dateMatch[1].trim();
    }

    // Extrair Hora
    const timeMatches = [...text.matchAll(timeRegex)];
    if (timeMatches.length > 0) {
        data.time = timeMatches[timeMatches.length - 1][1].trim(); 
    }

    console.log("LOG DEPURAÇÃO EXTRAÇÃO: Dados Extraídos Finais:", data);
    return data;
};


/**
 * Salva a imagem no Firebase Storage e registra o ponto no Firestore.
 */
export const savePointData = async (photoUri, pointData) => {
  const user = auth.currentUser;
  if (!user) {
    console.error('ERRO: Usuário não autenticado. Por favor, faça login novamente.');
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
    const pontosCollection = collection(db, 'pontos');
    
    let pointDateTime;
    const [day, month, year] = pointData.date.split('/').map(Number);
    const [hours, minutes] = pointData.time.split(':').map(Number);

    const isValidDate = !isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && month > 0 && year > 0;
    const isValidTime = !isNaN(hours) && !isNaN(minutes) && hours >= 0 && minutes >= 0;

    if (isValidDate && isValidTime) {
      pointDateTime = new Date(year, month - 1, day, hours, minutes);
    } else {
      pointDateTime = new Date(); 
    }

    if (isNaN(pointDateTime.getTime())) {
        pointDateTime = new Date();
    }
    
    let workdayDate = new Date(pointDateTime);
    if (pointDateTime.getHours() >= 0 && pointDateTime.getHours() < 5) { 
      workdayDate.setDate(workdayDate.getDate() - 1);
    }

    const finalPointData = {
      ...pointData,
      image_url: imageUrl,
      usuario_id: user.uid,
      timestamp_salvo: new Date().toISOString(),
      timestamp_ponto: pointDateTime.toISOString(),
      origem: 'foto',
      workday_date: workdayDate.toLocaleDateString('pt-BR'), 
      name_from_ocr: pointData.name,
    };
    
    await addDoc(pontosCollection, finalPointData);
    console.log("LOG SALVAMENTO: Dados enviados para o Firestore com sucesso!");
    return true;

  } catch (error) {
    console.error('ERRO: Falha ao enviar dados para o Firebase:', error);
    return false;
  }
};


/**
 * Verifica se um registro de ponto já existe no Firestore.
 */
export const checkIfDuplicate = async (data) => {
  console.log("DEBUG: Verificando duplicidade para:", data.name, data.date, data.time);
  const user = auth.currentUser;
  if (!user) return false;

  const pontosRef = collection(db, 'pontos');
  const q = query(
    pontosRef,
    where('usuario_id', '==', user.uid),
    where('date', '==', data.date),
    where('time', '==', data.time)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("ERRO: Falha ao verificar duplicidade:", error);
    return false; 
  }
};

/**
 * Limpa todos os registros de pontos do usuário logado (APENAS para desenvolvimento).
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
        console.error("ERRO: Falha ao limpar pontos:", error);
        return false;
    }
};