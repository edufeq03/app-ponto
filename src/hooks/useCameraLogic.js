import { useState, useRef, useCallback } from 'react';
import { Alert, Dimensions } from 'react-native';
// Removeu ImagePicker
import { useCameraPermissions } from "expo-camera"; // Reintroduzido
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../../config/firebase_config.js';
import { findDocumentBoundingBox, analyzeImage, extractDataFromText, checkIfDuplicate, savePointData } from '../../services/cameraService.js'; 

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export const useCameraLogic = (navigation) => {
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [originalExtractedData, setOriginalExtractedData] = useState({});
  const [originalText, setOriginalText] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [permission, requestPermission] = useCameraPermissions(); 
  const cameraRef = useRef(null); 
  const viewShotRef = useRef(null); // Ref para o ViewShot
  const [processing, setProcessing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Pede permissão ao focar na tela, se não tiver sido concedida
      if (!permission?.granted) {
          requestPermission();
      }
    }, [permission])
  );

  // NOVO FLUXO: 1. Tira a foto e abre a pré-visualização (RÁPIDO, sem OCR)
  const handleTakePhoto = async (setPhotoUri, setPreviewVisible) => {
    if (cameraRef.current) {
      try {
        console.log("LOG DEPURAÇÃO FOTO: Capturando foto...");
        
        // Tira a foto usando a câmera customizada
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
        
        if (!photo) return;
        
        console.log("LOG DEPURAÇÃO FOTO: Foto capturada. URI:", photo.uri.substring(0, 50) + "...");
        
        // Salva a URI e abre a pré-visualização
        setPhotoUri(photo.uri);
        setPreviewVisible(true);
        
      } catch (error) {
        console.error("ERRO FOTO: Falha ao tirar a foto:", error);
        Alert.alert("Erro", "Falha ao tirar a foto. Tente novamente.");
      }
    }
  };
  
  // NOVO FLUXO: 2. Confirma a foto e inicia o OCR (LENTO)
  const handleTakePhotoCustom = async (uri) => {
    setProcessing(true);

    try {
        // --- RECORTAR/MANIPULAR IMAGEM PARA REDUZIR TAMANHO ---
        console.log("LOG DEPURAÇÃO OCR: Manipulando imagem para análise (compressão e redimensionamento)...");
        
        // 1. Redimensiona/Comprime a imagem original para um tamanho ideal para o OCR
        const manipulatedImage = await manipulateAsync(
            uri, 
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: SaveFormat.JPEG, base64: true }
        );
        
        if (!manipulatedImage.base64) {
            throw new Error("Falha ao manipular a imagem.");
        }
        
        const base64ImageToAnalyze = manipulatedImage.base64;

        // --- ANÁLISE OCR ---
        console.log("LOG DEPURAÇÃO OCR: Iniciando análise OCR...");
        const detectedText = await analyzeImage(base64ImageToAnalyze);
        
        // REINSERÇÃO DOS LOGS DE DEBUG
        console.log("DEBUG CHECK: OCR retornou texto? Tamanho:", detectedText.length);
        console.log("DEBUG CHECK: Conteúdo inicial do OCR:", detectedText.substring(0, Math.min(detectedText.length, 50)));
        
        const extracted = extractDataFromText(detectedText);
        console.log("LOG DEPURAÇÃO: OCR concluído. Abrindo modal de validação.");
        
        // Finaliza o processamento e abre o modal de validação
        setExtractedData({ ...extracted, photoUri: uri }); // Usa a URI da foto original para upload
        setOriginalExtractedData(extracted);
        setOriginalText(detectedText);
        setProcessing(false);
        setValidationModalVisible(true);
        
    } catch (error) {
      // Em caso de qualquer erro (Rede, Vision API, manipulação), falha para manual
      Alert.alert("Erro de Processamento", "O OCR falhou ou a rede está instável. Por favor, preencha os dados manualmente.");
      console.error("LOG DEPURAÇÃO: ERRO - Falha no Processamento OCR:", error);
      
      // Abre o modal de validação com dados vazios para preenchimento manual
      setExtractedData({ name: 'Nome não detectado', date: '', time: '', photoUri: uri });
      setOriginalText('');
      setProcessing(false);
      setValidationModalVisible(true);
    }
  };
  
  const handleValidationSubmit = async () => {
    // A data e hora serão validadas (e formatadas) pelo ValidationModal, 
    // mas mantemos o check de ausência.
    if (!extractedData.date || !extractedData.time) {
      Alert.alert("Erro", "Data e Hora são obrigatórios. Corrija o formulário.");
      return;
    }
    
    setProcessing(true);
    setValidationModalVisible(false);
    
    console.log("LOG DEPURAÇÃO: Verificando duplicidade...");
    const isDuplicate = await checkIfDuplicate(extractedData);
    if (isDuplicate) {
      Alert.alert("Ponto Duplicado", "Este ponto parece já ter sido registrado.");
      setProcessing(false);
      return;
    }

    try {
      console.log("LOG DEPURAÇÃO: Iniciando salvamento final...");
      // A função savePointData no cameraService.js está blindada contra RangeError
      const uploadSuccess = await savePointData(photoUri, extractedData); 
      
      if (uploadSuccess) {
        Alert.alert("Sucesso", "Ponto registrado com sucesso!");
        navigation.navigate('Summary');
      } else {
        Alert.alert("Erro de Envio", "Não foi possível registrar o ponto. Tente novamente.");
      }

    } catch (error) {
      console.error("LOG DEPURAÇÃO: Erro no envio final:", error);
      Alert.alert("Erro", "Ocorreu um erro inesperado ao finalizar o registro.");
    } finally {
      setProcessing(false);
    }
  };

  const handleValidationCancel = () => {
    setValidationModalVisible(false);
    setPhotoUri(null);
    setExtractedData({});
    setOriginalExtractedData({});
    setOriginalText('');
  };

  return {
    cameraModalVisible, setCameraModalVisible,
    validationModalVisible, setValidationModalVisible,
    extractedData, setExtractedData,
    originalText,
    photoUri, setPhotoUri, 
    permission, requestPermission,
    cameraRef,
    viewShotRef,
    processing,
    handleTakePhoto,
    handleTakePhotoCustom,
    handleValidationSubmit,
    handleValidationCancel,
    windowWidth,
    windowHeight,
  };
};