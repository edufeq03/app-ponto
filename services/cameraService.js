import axios from 'axios';
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';
import { db, storage, auth } from '../config/firebase_config';
import { Alert } from 'react-native'; // Importando Alert para uso em erros

/**
 * Encontra a caixa delimitadora (bounding box) do texto na imagem usando a API Vision.
 * (A lógica de recorte não está sendo aplicada ativamente, mas a chamada está mantida)
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
        // Retorna um placeholder, pois a lógica de recorte está desativada no momento
        return { 
            originX: 0, 
            originY: 0, 
            width: 1, 
            height: 1 
        };
    }

    return null;
  } catch (error) {
    console.error("ERRO DEPURAÇÃO BOX: Falha na API Vision para bounding box:", error.response ? error.response.data : error.message);
    return null;
  }
};


/**
 * Executa OCR na imagem para extrair texto.
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

        const detectedText = response.data.responses[0]
            ?.fullTextAnnotation
            ?.text || '';

        if (detectedText) {
            console.log("LOG DEPURAÇÃO OCR: OCR detectou texto. Retornando texto.");
            console.log("LOG DEPURAÇÃO OCR: Conteúdo RAW Completo:\n", detectedText.substring(0, Math.min(detectedText.length, 500)) + (detectedText.length > 500 ? '...' : '')); 
        } else {
            console.warn("WARN DEPURAÇÃO OCR: OCR concluído, mas nenhum texto detectado. Retornando string vazia.");
        }
        
        return detectedText;
        
    } catch (error) {
        console.error("ERRO DEPURAÇÃO OCR: Falha na API Vision para OCR:", error.response ? error.response.data : error.message);
        return '';
    }
};

/**
 * Extrai dados estruturados (Nome, Data, Hora) a partir do texto do OCR.
 */
export const extractDataFromText = (text) => {
    const data = {
        name: 'Nome não detectado',
        date: '', // Formato DD/MM/AAAA
        time: '', // Formato HH:MM
        justificativa: 'Ponto de ' + new Date().toLocaleDateString('pt-BR'), // Usado para o modal de validação
    };
    
    console.log("LOG DEPURAÇÃO EXTRAÇÃO: Texto recebido para extração (Primeiros 100 chars):", text.substring(0, Math.min(text.length, 100)));

    // Expressões regulares
    const nameRegex = /(NOME|FUNCIONÁRIO|COLABORADOR):\s*([^\n\r]+)/i;
    // Padrão que captura DD/MM/AAAA
    const dateRegex = /(\d{2}\/\d{2}\/\d{4})/; 
    // Padrão que captura HH:MM, priorizando o último (geralmente hora de saída/registro)
    const timeRegex = /(\d{2}:\d{2})/g; 

    // Extrair Nome
    const nameMatch = text.match(nameRegex);
    if (nameMatch && nameMatch[2]) {
        data.name = nameMatch[2].trim().toUpperCase();
    } else {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        // Tenta a segunda linha, assumindo que a primeira pode ser um título
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
        // Pega a última ocorrência (o que é razoável para a hora do ponto)
        data.time = timeMatches[timeMatches.length - 1][1].trim(); 
    }
    
    // Atualiza a justificativa com a data encontrada
    if (data.date) {
        data.justificativa = `Ponto do dia ${data.date}`;
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
    console.error('ERRO SALVAR: Usuário não autenticado. Por favor, faça login novamente.');
    Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
    return false;
  }
  console.log("LOG SALVAR: Iniciando salvamento de dados para o Firestore.");

  try {
    // 1. Upload da imagem para o Firebase Storage
    // Definimos o nome do campo como 'image_url' (Contrato de Dados)
    const imageRef = ref(storage, `pontos_imagens/${user.uid}/${Date.now()}.jpg`);
    const response = await fetch(photoUri);
    const blob = await response.blob();
    await uploadBytes(imageRef, blob);
    const imageUrl = await getDownloadURL(imageRef);
    console.log("LOG SALVAR: Imagem salva. URL:", imageUrl.substring(0, 60) + '...');

    // 2. Criação do Timestamp do Firestore (CORREÇÃO CRÍTICA)
    const [day, month, year] = pointData.date.split('/').map(Number);
    const [hours, minutes] = pointData.time.split(':').map(Number);
    
    let pointDateTime;
    // O construtor new Date(year, monthIndex, day, hours, minutes) é robusto
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hours) && !isNaN(minutes)) {
        // month - 1 porque JavaScript usa 0-11 para meses
        pointDateTime = new Date(year, month - 1, day, hours, minutes); 
    } else {
        console.warn("WARN SALVAR: Data/Hora inválida na extração. Usando a data/hora atual para o Timestamp.");
        pointDateTime = new Date();
    }

    if (isNaN(pointDateTime.getTime())) {
        console.error("ERRO SALVAR: Tentativa de criar Date falhou. Usando a data/hora atual.");
        pointDateTime = new Date();
    }
    
    // Calcula a data de referência do dia de trabalho (workday_date)
    const workdayDateObj = new Date(pointDateTime);
    // Se for depois da meia-noite e antes das 5 da manhã, o ponto pertence ao dia anterior
    if (workdayDateObj.getHours() >= 0 && workdayDateObj.getHours() < 5) { 
        workdayDateObj.setDate(workdayDateObj.getDate() - 1);
    }
    // Formato YYYY-MM-DD (melhor para ordenação no Firestore)
    const workdayDateStr = `${workdayDateObj.getFullYear()}-${String(workdayDateObj.getMonth() + 1).padStart(2, '0')}-${String(workdayDateObj.getDate()).padStart(2, '0')}`;


    // 3. Registro do ponto no Firestore com o Contrato de Dados (Novos Campos)
    const pontosCollection = collection(db, 'pontos');

    const finalPointData = {
      ...pointData,
      image_url: imageUrl, // Contrato de Dados: image_url
      usuario_id: user.uid,
      timestamp_salvo: new Date(), // Timestamp do momento do salvamento (para auditoria)
      timestamp_ponto: pointDateTime, // Timestamp do ponto (Date object, tipo Firestore Timestamp)
      origem: 'foto',
      workday_date: workdayDateStr, // Contrato de Dados: YYYY-MM-DD
      name_from_ocr: pointData.name,
      
      // --- NOVOS CAMPOS DO BANCO DE HORAS (Valores Padrão) ---
      justificativa_status: 'COMPENSADO', // Padrão inicial.
      minutos_banco: 0, 
      minutos_hora_extra: 0, 
      // O cálculo real de saldo será feito no timeService/hook e atualizado depois do resumo diário
      // ----------------------------------------------------
    };
    
    await addDoc(pontosCollection, finalPointData);
    console.log("LOG SALVAMENTO: Ponto salvo com sucesso no Firestore. Workday Date:", workdayDateStr);
    return true;

  } catch (error) {
    console.error('ERRO SALVAR: Falha ao enviar dados para o Firebase:', error);
    Alert.alert('Erro de Envio', 'Não foi possível salvar o ponto. Verifique sua conexão.');
    return false;
  }
};


/**
 * Verifica se um registro de ponto já existe no Firestore.
 */
export const checkIfDuplicate = async (data) => {
    // ... (função mantida sem alterações)
  console.log("LOG DUPLICIDADE: Verificando duplicidade para:", data.name, data.date, data.time);
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
    const isDuplicated = !querySnapshot.empty;
    console.log(`LOG DUPLICIDADE: Verificação concluída. Duplicado: ${isDuplicated}`);
    return isDuplicated;
  } catch (error) {
    console.error("ERRO DUPLICIDADE: Falha ao verificar duplicidade:", error);
    return false; 
  }
};

/**
 * Limpa todos os registros de pontos do usuário logado (APENAS para desenvolvimento).
 */
export const clearAllPoints = async () => {
    // ... (função mantida sem alterações)
    console.log("LOG LIMPEZA: Iniciando a limpeza de todos os pontos do usuário para desenvolvimento...");
    const user = auth.currentUser;
    if (!user) {
        console.error("ERRO LIMPEZA: Usuário não autenticado.");
        return false;
    }

    try {
        const pontosRef = collection(db, 'pontos');
        const q = query(pontosRef, where('usuario_id', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("LOG LIMPEZA: Nenhumn ponto encontrado para o usuário. Nenhuma limpeza necessária.");
            return true;
        }

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(docSnapshot => {
            batch.delete(doc(db, 'pontos', docSnapshot.id));
        });

        await batch.commit();
        console.log(`LOG LIMPEZA: ${querySnapshot.size} pontos deletados com sucesso.`);
        return true;
    } catch (error) {
        console.error("ERRO LIMPEZA: Falha ao limpar pontos:", error);
        return false;
    }
};