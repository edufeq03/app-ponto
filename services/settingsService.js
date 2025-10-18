// src/services/settingsService.js

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';

const getSettingsDocRef = (userId) => doc(db, 'user_settings', userId);

// Definição do Contrato de Dados Padrão (EXPANDIDO)
// Isso garante que mesmo usuários sem um documento de configurações tenham valores base.
export const DEFAULT_SETTINGS = {
    // === CONFIGURAÇÕES GERAIS DE HORAS ===
    jornada_diaria_padrao_horas: 8,          // Jornada padrão em horas (Ex: 8)
    duracao_intervalo_minutos: 60,           // Duração mínima do intervalo (Ex: 60 min = 1 hora)
    utiliza_banco_horas: true,               // Boolean: 'Sim' ou 'Não'
    limite_banco_horas_diario_minutos: 120, // Limite diário de crédito BH (120 min = 2 horas)
    
    // === HORÁRIOS FIXOS (Se flexibilidade_intervalo for FALSE) ===
    horario_entrada_padrao: '08:00',         // Entrada padrão (Ex: '08:00')
    horario_saida_padrao: '17:00',           // Saída padrão (Ex: '17:00')

    // === CONFIGURAÇÕES DE FLEXIBILIDADE / JUSTIFICATIVA ===
    flexibilidade_intervalo: false,          // Boolean: Se for true, ignora horários fixos de almoço (sua 'janela')
    modo_padrao_atraso: 'COMPENSADO',        // 'COMPENSADO', 'INJUSTIFICADO'
    
    // === CONFIGURAÇÕES EXISTENTES (MANTIDAS) ===
    settlementDate: new Date().toISOString(),// Data de acerto (ISO String)
    settlementPolicy: 'Anual',               // Política de acerto: 'Mensal', 'Anual', 'Semanal'
    nightCutoffHour: 5,                      // Horário de Corte Noturno (0 a 23)
};


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
            // Fusão: Garante que novas chaves (como as que adicionamos agora) sejam incluídas,
            // mesmo que o usuário tenha um documento antigo no Firestore.
            return {
                ...DEFAULT_SETTINGS, 
                ...docSnap.data()
            };
        } else {
            // Retorna as configurações padrão se o documento não existir
            console.log('LOG: Configurações do usuário não encontradas. Usando padrões.');
            return DEFAULT_SETTINGS;
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
        // setDoc com merge: true evita apagar campos antigos se o objeto settings não for completo.
        await setDoc(docRef, settings, { merge: true });
        console.log('LOG: Configurações do usuário salvas com sucesso.');
        return true;
    } catch (error) {
        console.error('ERRO: Falha ao salvar configurações do usuário:', error);
        return false;
    }
};