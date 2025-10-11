import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Image, Modal, Alert } from 'react-native';
import React, { useState } from 'react'; 
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot'; 
import AdBannerPlaceholder from '../src/components/AdBannerPlaceholder';

import { useCameraLogic } from '../src/hooks/useCameraLogic';
import ValidationModal from '../src/components/ValidationModal';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const RECEIPT_ASPECT_RATIO = 5.5 / 4; 

export default function CameraScreen({ navigation }) {
  const {
    cameraModalVisible, setCameraModalVisible, 
    validationModalVisible,
    extractedData, setExtractedData,
    originalText,
    photoUri, setPhotoUri,
    processing,
    cameraRef,
    viewShotRef,
    handleTakePhoto,      
    handleTakePhotoCustom, 
    handleValidationSubmit,
    handleValidationCancel,
    permission, requestPermission,
  } = useCameraLogic(navigation); 

  const [previewVisible, setPreviewVisible] = useState(false);

  const handleDataChange = (key, value) => {
    setExtractedData(prevData => ({ ...prevData, [key]: value }));
  };
  
  const confirmPhoto = () => {
    setPreviewVisible(false);
    setCameraModalVisible(false); 
    handleTakePhotoCustom(photoUri); 
  };

  const retakePhoto = () => {
    setPhotoUri(null); 
    setPreviewVisible(false);
    setCameraModalVisible(true); 
  };

  const frameWidth = windowWidth * 0.8;
  const frameHeight = frameWidth / RECEIPT_ASPECT_RATIO;
  
  if (permission === null || !permission.granted) {
    return (
      <View style={styles.loadingOverlay}>
        <Text style={styles.loadingText}>Aguardando permissão da câmera...</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.cameraButton}>
          <Text style={styles.cameraButtonText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (processing) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Processando imagem...</Text>
      </View>
    );
  }

  const CameraModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={cameraModalVisible}
      onRequestClose={() => setCameraModalVisible(false)}
    >
      <SafeAreaView style={styles.cameraModalContainer}>
        {/* CORREÇÃO: ViewShot Compactado para evitar erro de string solta */}
        <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.viewShotContainer}>
          <CameraView style={styles.camera} ref={cameraRef}/>
          <View style={[styles.cameraFrameContainer, styles.absoluteOverlay]}>
            <View style={[styles.cameraFrame, { width: frameWidth, height: frameHeight }]} />
          </View>
        </ViewShot>

        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={() => setCameraModalVisible(false)} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => handleTakePhoto(setPhotoUri, setPreviewVisible)} style={styles.captureButton}>
            <View style={styles.captureCircle} />
          </TouchableOpacity>
          
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const PreviewModal = () => (
      <Modal
          animationType="slide"
          transparent={false}
          visible={previewVisible}
          onRequestClose={retakePhoto}
      >
          <SafeAreaView style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Conferir Foto</Text>
              {photoUri && (
                  <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain"/>
              )}
              <Text style={styles.previewSubtitle}>A foto está nítida e bem focada?</Text>

              <View style={styles.previewControls}>
                  <TouchableOpacity onPress={retakePhoto} style={styles.retakeButton}>
                      <Text style={styles.retakeButtonText}>Tirar Outra</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmPhoto} style={styles.confirmButton}>
                      <Text style={styles.confirmButtonText}>Confirmar e Processar</Text>
                  </TouchableOpacity>
              </View>
          </SafeAreaView>
      </Modal>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Registrar Ponto</Text>
        <Text style={styles.subtitle}>Use a câmera para capturar seu comprovante de ponto.</Text>

        <TouchableOpacity style={styles.cameraButton} onPress={() => setCameraModalVisible(true)}>
          <Text style={styles.cameraButtonText}>Abrir Câmera do App</Text>
        </TouchableOpacity>

        <AdBannerPlaceholder />
      </View>
      
      <CameraModal />
      <PreviewModal />
      
      <ValidationModal
        visible={validationModalVisible}
        data={extractedData}
        originalText={originalText}
        onDataChange={handleDataChange}
        onCancel={handleValidationCancel}
        onSubmit={handleValidationSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  cameraButton: { backgroundColor: '#007AFF', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, marginBottom: 20, elevation: 3 },
  cameraButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cameraModalContainer: { flex: 1, backgroundColor: 'black' },
  viewShotContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  absoluteOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, }, 
  cameraControls: { position: 'absolute', bottom: 0, width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'transparent', borderWidth: 5, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureCircle: { width: 65, height: 65, borderRadius: 32.5, backgroundColor: 'white' },
  cancelButton: { padding: 10, marginTop: 20 },
  cancelButtonText: { color: 'white', fontSize: 16 },
  cameraFrameContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  cameraFrame: { borderWidth: 3, borderColor: 'yellow', borderStyle: 'dashed', borderRadius: 5, opacity: 0.8 },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  previewContainer: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', paddingTop: 40 },
  previewTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  previewSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  previewImage: { width: windowWidth * 0.9, height: windowHeight * 0.6, marginBottom: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  previewControls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 20 },
  confirmButton: { backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10 },
  confirmButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  retakeButton: { backgroundColor: '#F44336', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10 },
  retakeButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});