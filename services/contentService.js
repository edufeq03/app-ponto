// src/services/contentService.js

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase_config'; // Garanta que 'db' está importado corretamente

const getContentDocRef = () => doc(db, 'app_content', 'legal_references');

/**
 * Carrega os links e IDs de vídeos do Firestore.
 * O documento é 'legal_references' na coleção 'app_content'.
 */
export const loadLegalReferences = async () => {
    try {
        const docRef = getContentDocRef();
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("LOG: Conteúdo legal carregado do Firestore.");
            return docSnap.data();
        } else {
            console.warn("ALERTA: Documento 'legal_references' não encontrado. Usando valores padrão.");
            // Valores de fallback estáticos
            return {
                video_title: "Vídeo Padrão: Tutorial",
                video_id: "dQw4w9WgXcQ", // Exemplo de ID (Rick Astley - Never Gonna Give You Up)
                clt_link: "https://www.google.com/search?q=clt",
            };
        }
    } catch (error) {
        console.error('ERRO: Falha ao carregar referências legais:', error);
        return null;
    }
};