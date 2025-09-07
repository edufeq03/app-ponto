import { useState, useRef } from 'react';
import { StyleSheet, Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GOOGLE_CLOUD_VISION_API_KEY } from './api_config';
import { db, storage, auth } from './firebase_config';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

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
  const [isSaving, setIsSaving] = useState(false);
  const [justification, setJustification] = useState('');

  const sendToFirestore = async () => {
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Por favor, faça login novamente.');
      setIsSaving(false);
      return;
    }

    try {
      const pointData = {
        origem: 'camera',
        timestamp_ponto: new Date().toISOString(),
        justificativa: justification,
        usuario_id: user.uid,
      };

      const docRef = await addDoc(collection(db, 'pontos'), pointData);
      console.log('Ponto registrado com sucesso com ID: ', docRef.id);
      Alert.alert('Sucesso', 'Ponto registrado com sucesso!');
      navigation.goBack();
    } catch (e) {
      console.error('Erro ao adicionar documento: ', e);
      Alert.alert('Erro', 'Não foi possível registrar o ponto. Tente novamente.');
    } finally {
      setIsSaving(false);
      setJustification('');
      setValidationModalVisible(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });

        const imageUri = photo.uri;
        const compressedImage = await manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );

        const apiRequestBody = {
          requests: [{
            image: { content: compressedImage.base64 },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        };

        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
          apiRequestBody
        );

        const detectedText = response.data.responses[0].fullTextAnnotation?.text;
        setOriginalText(detectedText || '');
        setProcessing(false);
        setValidationModalVisible(true);
      } catch (error) {
        setProcessing(false);
        console.error('Erro na API do Google Vision:', error);
        Alert.alert('Erro', 'Não foi possível processar a imagem. Verifique sua conexão e a chave da API.');
      }
    }
  };

  if (permission === null) {
    return <SafeAreaView><View /><Text>Requisitando permissão da câmera...</Text></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Precisamos de permissão para acessar a câmera.</Text>
        <Button onPress={requestPermission} title="Conceder Permissão" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} />
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureCircle} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay */}
      {processing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Processando imagem...</Text>
        </View>
      )}

      {/* Modal de Validação */}
      <Modal
        visible={validationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setValidationModalVisible(false)}
      >
        <View style={styles.justificationModalContainer}>
          <View style={styles.justificationModalContent}>
            <Text style={styles.justificationHeader}>Registrar Ponto por Imagem</Text>
            <Text style={styles.justificationLabel}>Justificativa:</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              multiline
              onChangeText={setJustification}
              value={justification}
              placeholder="Descreva a justificativa para o registro de ponto por imagem"
            />
            <View style={styles.modalFooter}>
              <Button title="Cancelar" onPress={() => setValidationModalVisible(false)} color="red" />
              <Button title="Registrar Ponto" onPress={sendToFirestore} disabled={isSaving} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
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
  },
  justificationHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  justificationLabel: {
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
  modalFooter: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});