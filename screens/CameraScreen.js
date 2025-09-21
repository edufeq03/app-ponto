import { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../config/firebase_config';
import { findDocumentBoundingBox, analyzeImage, extractDataFromText, checkIfDuplicate, uploadImage, sendToFirestore, getUserProfileName, saveUserProfileName } from '../services/cameraService.js';
import AdBannerPlaceholder from '../components/AdBannerPlaceholder'; // Importa o novo componente

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const RECEIPT_ASPECT_RATIO = 5.5 / 4;

export default function CameraScreen({ navigation }) {
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [originalExtractedData, setOriginalExtractedData] = useState({});
  const [originalText, setOriginalText] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justificationModalVisible, setJustificationModalVisible] = useState(false);
  const [justification, setJustification] = useState('');
  const [userProfileName, setUserProfileName] = useState(null);
  const [nameInputModalVisible, setNameInputModalVisible] = useState(false);
  const [inputtedName, setInputtedName] = useState('');

  useEffect(() => {
    const fetchProfileName = async () => {
      const name = await getUserProfileName();
      setUserProfileName(name);
    };
    fetchProfileName();
  }, []);

  const handleTakePhoto = async () => {
    if (cameraRef.current) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          mute: true,
        });

        setPhotoUri(photo.uri);
        setCameraModalVisible(false);

        let imageUriToAnalyze = photo.uri;
        let base64ImageToAnalyze = photo.base64;

        const boundingBox = await findDocumentBoundingBox(photo.base64);

        if (boundingBox) {
          try {
            const croppedImage = await manipulateAsync(
              photo.uri,
              [{ crop: boundingBox }],
              { compress: 1, format: SaveFormat.JPEG, base64: true }
            );
            imageUriToAnalyze = croppedImage.uri;
            base64ImageToAnalyze = croppedImage.base64;
          } catch (cropError) {
            console.error("ERRO: Falha ao recortar a imagem. Usando a imagem original.", cropError);
          }
        }

        const detectedText = await analyzeImage(base64ImageToAnalyze);
        const extracted = extractDataFromText(detectedText);
        setExtractedData({ ...extracted, photoUri: imageUriToAnalyze });
        setOriginalExtractedData(extracted);
        setOriginalText(detectedText);
        setProcessing(false);
        
        if (!userProfileName) {
            setNameInputModalVisible(true);
        } else {
            setValidationModalVisible(true);
        }
      } catch (error) {
        console.error("ERRO: Falha ao tirar foto ou processar a imagem:", error);
        Alert.alert("Erro", "Não foi possível processar a imagem. Tente novamente.");
        setProcessing(false);
      }
    }
  };

  const handleSaveProfileName = async () => {
      if (!inputtedName) {
          Alert.alert("Aviso", "Por favor, digite seu nome.");
          return;
      }
      const success = await saveUserProfileName(inputtedName);
      if (success) {
          setUserProfileName(inputtedName);
          setNameInputModalVisible(false);
          setValidationModalVisible(true);
      } else {
          Alert.alert("Erro", "Não foi possível salvar seu nome. Tente novamente.");
      }
  };

  const validateAndSavePoint = async (data, justification = null) => {
    setIsSaving(true);
    try {
      if (!data.name || !data.date || !data.time) {
        Alert.alert(
          "Dados Incompletos",
          "Não foi possível extrair o nome, a data ou a hora. Por favor, preencha manualmente ou tire outra foto.",
          [
            { text: "OK" }
          ]
        );
        return;
      }

      const isDuplicate = await checkIfDuplicate(data);
      if (isDuplicate) {
        Alert.alert("Aviso", "Este comprovante já foi registrado!");
        setIsSaving(false);
        setValidationModalVisible(false);
        return;
      }

      if (userProfileName && data.name && data.name.trim().toUpperCase() !== userProfileName.trim().toUpperCase()) {
        Alert.alert(
          "Aviso de Nome Diferente",
          `O nome extraído do comprovante (${data.name}) não corresponde ao seu nome de usuário (${userProfileName}). Por favor, justifique a diferença.`,
          [
            { text: "Cancelar", style: "cancel", onPress: () => {
              setIsSaving(false);
            }},
            { text: "Justificar", onPress: () => {
              setIsSaving(false);
              setValidationModalVisible(false);
              setJustificationModalVisible(true);
            }}
          ]
        );
        return;
      }
      
      await savePointAndImage(data, justification);
    } catch (error) {
      console.error("ERRO: Falha na validação ou salvamento:", error);
      Alert.alert("Erro", "Ocorreu um erro. Por favor, tente novamente.");
    } finally {
        setIsSaving(false);
    }
  };

  const savePointAndImage = async (data, justification = null) => {
    setIsSaving(true);
    try {
      if (!photoUri) {
          throw new Error("URI da foto não encontrada.");
      }
      const photoURL = await uploadImage(photoUri);
      
      const success = await sendToFirestore(data, photoURL, justification);
      
      if (success) {
        Alert.alert("Sucesso!", "Dados enviados com sucesso para o banco de dados.");
        navigation.navigate('Histórico', { screen: 'Registros Individuais' });
      } else {
        Alert.alert("Erro", "Falha ao enviar os dados. Verifique a conexão.");
      }
    } catch (error) {
      console.error("ERRO: Falha ao salvar o ponto:", error);
      Alert.alert("Erro", "Ocorreu um erro ao salvar o ponto. Por favor, tente novamente.");
    } finally {
      setIsSaving(false);
      setJustificationModalVisible(false);
      setValidationModalVisible(false);
    }
  };

  const handleTryAgain = () => {
    setValidationModalVisible(false);
    setExtractedData({});
    setOriginalText('');
    setPhotoUri(null);
    setJustification('');
  };

  const handleOpenCamera = async () => {
    try {
      if (!permission.granted) {
          const permissionResult = await requestPermission();
          if (!permissionResult.granted) {
              Alert.alert("Câmera", "Você precisa habilitar o uso da câmera");
              return;
          }
      }
      setCameraModalVisible(true);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenCamera}>
            <Text style={styles.actionButtonText}>Tirar foto do comprovante</Text>
        </TouchableOpacity>
        <Text style={styles.infoText}>Use o menu abaixo para navegar entre as telas.</Text>
      </View>
      <Modal visible={cameraModalVisible} style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          ref={cameraRef}
        />
        <View style={styles.cameraFrameContainer}>
          <View style={styles.horizontalFrame} />
        </View>
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
            <View style={styles.captureButtonOuter}>
              <View style={styles.captureButtonInner}></View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraModalVisible(false)}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={nameInputModalVisible} animationType="slide" transparent={true}>
          <View style={styles.justificationModalContainer}>
              <View style={styles.justificationModalContent}>
                  <Text style={styles.justificationHeader}>Primeiro Acesso</Text>
                  <Text style={styles.justificationMessage}>Por favor, digite seu nome completo exatamente como aparece nos seus comprovantes de ponto.</Text>
                  <TextInput
                      style={styles.justificationInput}
                      onChangeText={setInputtedName}
                      value={inputtedName}
                      placeholder="Nome completo (Ex: EDUARDO TARGINE CAPELLA)"
                  />
                  <View style={styles.justificationButtonContainer}>
                      <Button title="Salvar e Continuar" onPress={handleSaveProfileName} />
                  </View>
              </View>
          </View>
      </Modal>

      <Modal visible={validationModalVisible} animationType="slide" style={{ flex: 1 }}>
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.scrollView}>
            <Text style={styles.modalHeader}>Confirme os Dados</Text>
            <Text style={styles.modalSubtitle}>Dados extraídos da imagem. Por favor, corrija se necessário.</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#e0e0e0' }]}
                onChangeText={(text) => setExtractedData({ ...extractedData, name: text })}
                value={extractedData.name}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Data:</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setExtractedData({ ...extractedData, date: text })}
                value={extractedData.date}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Hora:</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setExtractedData({ ...extractedData, time: text })}
                value={extractedData.time}
              />
            </View>
            <Text style={styles.originalTextLabel}>Texto original do comprovante:</Text>
            <Text style={styles.originalText}>{originalText}</Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Button
              title={isSaving ? "Salvando..." : "Confirmar"}
              onPress={() => validateAndSavePoint(extractedData)}
              disabled={isSaving}
            />
            <Button
              title="Tirar Outra Foto"
              onPress={handleTryAgain}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={justificationModalVisible} animationType="slide" transparent={true}>
        <View style={styles.justificationModalContainer}>
          <View style={styles.justificationModalContent}>
            <Text style={styles.justificationHeader}>Justifique a Diferença no Nome</Text>
            <Text style={styles.justificationMessage}>O nome extraído não corresponde ao seu. Por favor, explique a razão da diferença.</Text>
            <TextInput
              style={styles.justificationInput}
              onChangeText={setJustification}
              value={justification}
              multiline
              placeholder="Ex: 'Comprovante em nome de outro funcionário', 'Erro de leitura do OCR', etc."
            />
            <View style={styles.justificationButtonContainer}>
              <Button title="Cancelar" onPress={() => setJustificationModalVisible(false)} color="#666" />
              <Button 
                title="Confirmar" 
                onPress={() => savePointAndImage(extractedData, justification)} 
                disabled={isSaving || !justification} 
              />
            </View>
          </View>
        </View>
      </Modal>

      {processing && (
        <Modal transparent={true} animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processando imagem...</Text>
          </View>
        </Modal>
      )}
      {/* Espaço para Anúncio AdMob (Placeholder) */}
      <AdBannerPlaceholder />
    </SafeAreaView>
  );
}

const frameWidth = windowWidth * 0.9;
const frameHeight = frameWidth / RECEIPT_ASPECT_RATIO;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '80%',
    marginBottom: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  cameraControls: {
    position: "absolute",
    bottom: 30,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  cancelButton: {
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
  },
  cameraFrameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalFrame: {
    width: frameWidth,
    height: frameHeight,
    backgroundColor: 'transparent',
    borderColor: 'white',
    borderWidth: 2,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  originalTextLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
  },
  originalText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  modalFooter: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: 'white',
    fontSize: 16,
  },
  justificationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  justificationModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  justificationHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  justificationMessage: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  justificationInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  justificationButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});