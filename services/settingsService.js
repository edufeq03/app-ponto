// src/services/settingsService.js

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';

const getSettingsDocRef = (userId) => doc(db, 'user_settings', userId);

/**
 * Carrega as configurações do usuário no Firestore.
 * @returns {Promise<object>} Um objeto com as configurações ou um objeto padrão.
 */
export const loadUserSettings = async () => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const docRef = getSettingsDocRef(user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Retorna as configurações padrão se o documento não existir
            return {
                settlementDate: new Date().toISOString(),
                settlementPolicy: 'Anual',
                dailyStandardHours: 8, // MUDANÇA: Agora é um número inteiro (8 horas)
                nightCutoffHour: 5,    // Horário de Corte Noturno (0 a 23)
            };
        }
    } catch (error) {
        console.error('ERRO: Falha ao carregar configurações do usuário:', error);
        return null;
    }
};

/**
 * Salva as configurações do usuário no Firestore.
 * @param {object} settings - O objeto de configurações a ser salvo.
 * @returns {Promise<boolean>} True se for bem-sucedido.
 */
export const saveUserSettings = async (settings) => {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const docRef = getSettingsDocRef(user.uid);
        await setDoc(docRef, settings, { merge: true });
        console.log('LOG: Configurações do usuário salvas com sucesso.');
        return true;
    } catch (error) {
        console.error('ERRO: Falha ao salvar configurações do usuário:', error);
        return false;
    }
};