// services/firebaseService.js
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase_config';

/**
 * Salva a imagem no Firebase Storage e registra o ponto no Firestore.
 * @param {string} photoUri - URI da foto local a ser enviada.
 * @param {object} pointData - Os dados do ponto a serem salvos no Firestore.
 * @returns {Promise<boolean>} True se for bem-sucedido, false em caso de falha.
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
    const [day, month, year] = pointData.date.split('/').map(Number);
    const [hours, minutes] = pointData.time.split(':').map(Number);
    const pointDateTime = new Date(year, month - 1, day, hours, minutes);
    let workdayDate = new Date(pointDateTime);
    
    // MUDANÇA AQUI: Lógica de ponto noturno alterada de 6h para 5h.
    if (hours >= 0 && hours < 5) { // Se for entre 00:00 e 04:59
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
    console.log("DEBUG: Dados enviados para o Firestore com sucesso!");
    return true;

  } catch (error) {
    console.error('ERRO: Falha ao enviar dados para o Firebase:', error);
    return false;
  }
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