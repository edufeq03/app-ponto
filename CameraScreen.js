import { useState, useRef } from 'react';
import { StyleSheet, Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from './api_config';
import { db, storage, auth } from './firebase_config'; // Importe 'auth'

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// Remova o nome fixo, pois usaremos o UID do Firebase Auth
// const CURRENT_USER_NAME = "EDUARDO TARGINE CAPELLA";
const RECEIPT_ASPECT_RATIO = 5.5 / 4; // 1.375 (horizontal)

export default function CameraScreen({ navigation }) {
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [originalExtractedData, setOriginalExtractedData] = useState({});
  const [originalText, setOriginalText] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [justificationModalVisible, setJustificationModalVisible] = useState(false);
  const [justification, setJustification] = useState('');

  const sendToFirestore = async (isManualEdit = false) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Erro", "Usuário não autenticado. Faça login para registrar o ponto.");
        return;
      }
      
      const pointTimestamp = new Date();
      const pointData = {
        timestamp_ponto: pointTimestamp.toISOString(),
        origem: 'app',
        usuario_id: user.uid, // Salvando o UID do usuário
        data_digitada: extractedData.data,
        hora_digitada: extractedData.hora,
        justificativa: justification || null,
        is_edited: isManualEdit,
        original_data: originalExtractedData,
        original_text: originalText,
      };

      if (extractedData.image_url) {
        pointData.image_url = extractedData.image_url;
      }

      await addDoc(collection(db, 'pontos'), pointData);
      console.log('Ponto salvo com sucesso!');
      Alert.alert('Sucesso', 'Ponto registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar no Firestore:', error);
      Alert.alert('Erro', 'Não foi possível registrar o ponto.');
    } finally {
      setCameraModalVisible(false);
      setValidationModalVisible(false);
      setJustificationModalVisible(false);
      setProcessing(false);
    }
  };

  const takePicture = async () => {
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Conceda permissão para acessar a câmera nas configurações do seu dispositivo.');
      return;
    }
    if (cameraRef.current) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
          exif: false,
        });

        const croppedImage = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );

        if (croppedImage) {
          await processImage(croppedImage.base64);
        }
      } catch (error) {
        console.error('Erro ao tirar a foto ou processar:', error);
        setProcessing(false);
        Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
      }
    }
  };

  const processImage = async (base64) => {
    try {
      const requestBody = {
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }],
        }]
      };

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.data.responses[0].fullTextAnnotation) {
        const text = response.data.responses[0].fullTextAnnotation.text;
        setOriginalText(text);

        const lines = text.split('\n').filter(line => line.trim() !== '');
        let extractedTime = '';
        let extractedDate = '';

        const timeRegex = /(?:\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})/;
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}/;

        for (const line of lines) {
          if (timeRegex.test(line) && !extractedTime) {
            extractedTime = line.match(timeRegex)[0];
          }
          if (dateRegex.test(line) && !extractedDate) {
            extractedDate = line.match(dateRegex)[0];
          }
        }
        
        const imageUrl = await uploadImage(base64);

        setExtractedData({
          data: extractedDate,
          hora: extractedTime,
          image_url: imageUrl,
        });
        setOriginalExtractedData({
          data: extractedDate,
          hora: extractedTime,
        });
        setValidationModalVisible(true);

      } else {
        Alert.alert('Erro', 'Nenhum texto detectado na imagem.');
      }
    } catch (error) {
      console.error('Erro na API do Google Vision:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível processar a imagem.');
    } finally {
      setProcessing(false);
    }
  };
  
  const uploadImage = async (base64) => {
    if (!base64) return null;
    const storageRef = ref(storage, `receipts/${Date.now()}.jpg`);
    const imgBlob = await fetch(`data:image/jpeg;base64,${base64}`).then(r => r.blob());
    await uploadBytes(storageRef, imgBlob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleValidationConfirm = () => {
    setJustificationModalVisible(true);
  };
  
  const handleJustificationConfirm = () => {
    sendToFirestore(true);
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: 'center' }}>Precisamos de sua permissão para mostrar a câmera</Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Botão para abrir a câmera */}
      <TouchableOpacity onPress={() => setCameraModalVisible(true)} style={styles.button}>
        <Text style={styles.buttonText}>Abrir Câmera</Text>
      </TouchableOpacity>

      {/* Modal da Câmera */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={cameraModalVisible}
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} ref={cameraRef} facing="back">
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCameraModalVisible(false)}
              >
                <Text style={styles.text}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              />
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Modal de Validação de Dados */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={validationModalVisible}
        onRequestClose={() => setValidationModalVisible(false)}
      >
        <View style={styles.validationModalContainer}>
          <View style={styles.validationModalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Validar Informações</Text>
              
              <Text style={styles.label}>Data:</Text>
              <TextInput
                style={styles.input}
                value={extractedData.data}
                onChangeText={(text) => setExtractedData({ ...extractedData, data: text })}
              />
              
              <Text style={styles.label}>Hora:</Text>
              <TextInput
                style={styles.input}
                value={extractedData.hora}
                onChangeText={(text) => setExtractedData({ ...extractedData, hora: text })}
              />

              <Text style={styles.originalTextLabel}>Texto Original Detectado:</Text>
              <Text style={styles.originalText}>{originalText}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Corrigir e Salvar" onPress={handleValidationConfirm} />
              <Button title="Cancelar" onPress={() => setValidationModalVisible(false)} color="red" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Justificativa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={justificationModalVisible}
        onRequestClose={() => setJustificationModalVisible(false)}
      >
        <View style={styles.justificationModalContainer}>
          <View style={styles.justificationModalContent}>
            <Text style={styles.justificationHeader}>Justificativa</Text>
            <TextInput
              style={styles.input}
              placeholder="Descreva a justificativa para a alteração"
              value={justification}
              onChangeText={setJustification}
              multiline
            />
            <View style={styles.buttonGroup}>
              <Button title="Salvar Ponto" onPress={handleJustificationConfirm} />
              <Button title="Cancelar" onPress={() => setJustificationModalVisible(false)} color="red" />
            </View>
          </View>
        </View>
      </Modal>

      {processing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Processando imagem...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    width: '100%',
    aspectRatio: 9 / 16,
    justifyContent: 'flex-end',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
  validationModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  validationModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
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
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});