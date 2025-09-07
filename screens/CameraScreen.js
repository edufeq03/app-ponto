import { useState, useRef } from 'react';
import { StyleSheet, Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';

// Importe os novos serviços
import { processImageWithVision } from '../services/cameraService';
import { savePointData } from '../services/firebaseService';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justification, setJustification] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      setProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        setPhotoUri(photo.uri);
        
        const detectedText = await processImageWithVision(photo.uri);
        console.log('Texto detectado:', detectedText);

        setProcessing(false);
        setValidationModalVisible(true);
      } catch (error) {
        setProcessing(false);
        Alert.alert('Erro', error.message);
      }
    }
  };

  const handleSavePoint = async () => {
    setIsSaving(true);
    try {
      const pointData = {
        origem: 'camera',
        timestamp_ponto: new Date().toISOString(),
        justificativa: justification,
      };
      await savePointData(photoUri, pointData);
      
      Alert.alert('Sucesso', 'Ponto registrado com sucesso!');
      setJustification('');
      setValidationModalVisible(false);
      setPhotoUri(null);
      navigation.goBack();
      
    } catch (e) {
      console.error('Erro ao salvar ponto e imagem:', e);
      Alert.alert('Erro', e.message);
    } finally {
      setIsSaving(false);
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
          <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
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
              placeholder="Descreva a justificativa"
            />
            <View style={styles.modalFooter}>
              <Button title="Cancelar" onPress={() => setValidationModalVisible(false)} color="red" />
              <Button title="Registrar Ponto" onPress={handleSavePoint} disabled={isSaving} />
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