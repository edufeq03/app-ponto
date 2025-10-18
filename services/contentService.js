// src/services/contentService.js

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase_config'; // Garanta que 'db' está importado corretamente

const getContentDocRef = () => doc(db, 'app_content', 'legal_references');

/**
 * Carrega os links e IDs de vídeos do Firestore.
 * O documento é 'legal_references' na coleção 'app_content'.
 */
export const loadLegalReferences = async () => {
    console.log("LOG SERVICES: Tentando carregar referências legais do Firestore...");
    try {
        const docRef = getContentDocRef();
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("LOG FIREBASE SUCESSO: Dados carregados. Video ID recebido:", data.video_id); // 🚨 LOG AQUI
            return data;
        } else {
            console.warn("ALERTA FIREBASE VAZIO: Documento 'legal_references' não encontrado no Firestore. Usando valores padrão estáticos."); // 🚨 LOG AQUI
            // Valores de fallback estáticos
            return {
                video_title: "Vídeo Padrão: Never Gonna Give You Up (Teste)",
                video_id: "dQw4w9WgXcQ", // ID de teste do YouTube (Rick Astley - permite incorporação)
                clt_link: "https://www.google.com/search?q=clt",
            };
        }
    } catch (error) {
        console.error('ERRO FIREBASE CONEXÃO/PERMISSÃO: Falha ao carregar referências legais. Detalhe:', error); // 🚨 LOG AQUI
        return null;
    }
};