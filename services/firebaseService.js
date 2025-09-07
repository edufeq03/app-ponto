import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase_config';

/**
 * Salva a imagem no Firebase Storage e registra o ponto no Firestore.
 * @param {string} photoUri - URI da foto local a ser enviada.
 * @param {object} pointData - Os dados do ponto a serem salvos no Firestore.
 * @returns {Promise<void>}
 */
export const savePointData = async (photoUri, pointData) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
  }

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
};