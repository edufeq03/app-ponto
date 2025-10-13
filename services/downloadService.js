// services/downloadService.js
// Importação CORRIGIDA para usar a API legacy e manter a compatibilidade com downloadAsync
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import JSZip from 'jszip'; // Importação do jszip

/**
 * Cria um arquivo ZIP com as imagens baixadas.
 * @param {Array<{uri: string, name: string}>} filesToZip - Lista de arquivos locais (URI) e seus nomes.
 * @returns {Promise<string|null>} O URI do arquivo ZIP local.
 */
const createZipFile = async (filesToZip) => {
    const zip = new JSZip();

    // Adiciona cada arquivo (base64) ao objeto ZIP
    const addFilePromises = filesToZip.map(async (file) => {
        try {
            // Converte o arquivo local (URI) para base64
            const base64Content = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            // Adiciona ao ZIP. Note que o tipo (Blob, ArrayBuffer) deve ser ajustado,
            // mas o base64 geralmente é o mais prático no Expo/RN.
            zip.file(file.name, base64Content, { base64: true });
            
            // Opcional: deletar o arquivo temporário após adicionar ao ZIP
            await FileSystem.deleteAsync(file.uri);
        } catch (error) {
            console.error(`Falha ao processar arquivo para ZIP: ${file.name}`, error);
        }
    });

    await Promise.all(addFilePromises);

    // Gera o ZIP como base64
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    
    // Define o URI de destino do ZIP
    const zipUri = FileSystem.cacheDirectory + `comprovantes_ponto_${new Date().getTime()}.zip`;

    // Escreve o arquivo ZIP no sistema de arquivos local
    await FileSystem.writeAsStringAsync(zipUri, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    
    return zipUri;
};


/**
 * Baixa as imagens de comprovantes e as compacta em um arquivo ZIP.
 * @param {Array<{id: string, comprovante_url: string, timestamp_ponto: string}>} points - Lista de pontos com URLs.
 * @returns {Promise<string|null>} O URI do arquivo ZIP local, ou null em caso de erro.
 */
export const downloadAndZipComprovantes = async (points) => {
    // ... (restante da função permanece o mesmo, mas agora chamará o createZipFile implementado)
    if (points.length === 0) {
        Alert.alert("Erro", "Não há comprovantes para baixar no período selecionado.");
        return null;
    }
    
    const pointsWithImage = points.filter(p => p.comprovante_url);

    if (pointsWithImage.length === 0) {
        Alert.alert("Erro", "Nenhum comprovante com imagem encontrado.");
        return null;
    }

    const downloadPromises = pointsWithImage.map(point => {
        const pointDate = new Date(point.timestamp_ponto); 
        
        const date = pointDate.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const time = pointDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-');
        // Usamos .jpeg por ser mais genérico para imagens web
        const fileName = `Ponto_${date}_${time}_${point.id.substring(0, 5)}.jpeg`; 
        const localUri = FileSystem.cacheDirectory + fileName;

        // downloadAsync está correto AGORA por causa da importação 'legacy'
        return FileSystem.downloadAsync(point.comprovante_url, localUri)
            .then(({ uri }) => ({ uri, name: fileName }))
            .catch(error => {
                console.error(`Falha ao baixar ${fileName}:`, error);
                return null;
            });
    });

    const downloadedFiles = (await Promise.all(downloadPromises)).filter(f => f !== null);

    if (downloadedFiles.length === 0) {
        Alert.alert("Erro", "Falha ao baixar os comprovantes. Verifique as URLs das imagens.");
        return null;
    }

    return await createZipFile(downloadedFiles);
};

export const shareFile = async (fileUri, mimeType = 'application/zip') => {
    try {
        if (!(await Sharing.isAvailableAsync())) {
            Alert.alert("Erro", "Compartilhamento não disponível neste dispositivo.");
            return;
        }

        await Sharing.shareAsync(fileUri, {
            mimeType: mimeType,
            dialogTitle: 'Compartilhar Comprovantes de Ponto',
        });
    } catch (error) {
        console.error("Erro ao compartilhar arquivo:", error);
        Alert.alert("Erro", "Não foi possível compartilhar o arquivo.");
    }
};