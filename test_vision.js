import { processImageForVision } from './services/cameraService.js';
import * as fs from 'fs';
import * as path from 'path';
import Jimp from 'jimp';

// Substitua o caminho abaixo pelo caminho da sua imagem de teste
const imagePath = path.join(__dirname, 'recibo.jpg'); 
const userId = 't0A2JOPpdogsfA3Xb4AXOZReuZM2'; // Substitua pelo ID de um usuário real

async function runVisionTest() {
  try {
    console.log("Iniciando o processamento da imagem...");

    // 1. Carrega a imagem e converte para Base64
    const imageBuffer = fs.readFileSync(imagePath);
    const image = await Jimp.read(imageBuffer);
    const base64Image = await image.getBase64Async(Jimp.MIME_JPEG);
    
    // 2. Chama a função do seu serviço com a imagem em Base64
    const result = await processImageForVision(base64Image, userId);

    console.log("\n--- Resultado do Reconhecimento de Texto ---");
    console.log("Texto Original Completo:");
    console.log(result.originalText);
    
    console.log("\nDados Extraídos:");
    console.log(result.extractedData);
    
    console.log("\n--- Processamento Concluído ---");
    console.log("Ponto salvo no Firestore com sucesso!");
    
  } catch (error) {
    console.error("\nOcorreu um erro durante o teste:", error);
    if (error.response && error.response.data) {
        console.error("Resposta da API de Visão:", error.response.data);
    }
  }
}

runVisionTest();