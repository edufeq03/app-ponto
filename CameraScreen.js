import { useState, useRef } from 'react';
import { StyleSheet, Button, View, Modal, Alert, Text, TextInput, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // Importar SaveFormat
import { GOOGLE_CLOUD_VISION_API_KEY } from './api_config';
import { db, storage } from './firebase_config';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [originalExtractedData, setOriginalExtractedData] = useState({});
  const [originalText, setOriginalText] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Função para encontrar a caixa delimitadora do documento
  const findDocumentBoundingBox = async (base64Image) => {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION', // Apenas para detectar texto e suas posições
                },
              ],
            },
          ],
        }
      );

      const textAnnotations = response.data.responses[0]?.textAnnotations;
      if (!textAnnotations || textAnnotations.length <= 1) { // textAnnotations[0] é o texto completo
        console.log("Nenhum texto detectado para delimitar.");
        return null; // Não foi possível detectar texto suficiente
      }

      // Ignorar o primeiro elemento que contém todo o texto e focar nos blocos individuais
      const words = textAnnotations.slice(1);

      if (words.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      words.forEach(word => {
        if (word.boundingPoly && word.boundingPoly.vertices) {
          word.boundingPoly.vertices.forEach(vertex => {
            minX = Math.min(minX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxX = Math.max(maxX, vertex.x);
            maxY = Math.max(maxY, vertex.y);
          });
        }
      });

      // Adiciona uma margem para não cortar texto muito próximo às bordas
      const margin = 20; // Pixels de margem
      return {
        originX: Math.max(0, minX - margin),
        originY: Math.max(0, minY - margin),
        width: (maxX - minX) + (2 * margin),
        height: (maxY - minY) + (2 * margin),
      };

    } catch (error) {
      console.error('Erro ao detectar texto para bounding box:', error);
      return null;
    }
  };

  const analyzeImage = async (base64Image) => {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
        {
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION', // Usar DOCUMENT_TEXT_DETECTION para melhor OCR
                },
              ],
            },
          ],
        }
      );
      const textFromImage = response.data.responses[0]?.fullTextAnnotation?.text;
      if (!textFromImage) {
        return "Não foi possível detectar texto. Por favor, tente novamente.";
      }
      return textFromImage;
    } catch (error) {
      console.error('Erro ao analisar a imagem:', error);
      return "Não foi possível detectar texto. Por favor, tente novamente.";
    }
  };

  const extractDataFromText = (text) => {
    const data = {};
    const nameRegex = /NOME\s+(.*)/i;
    const nameMatch = text.match(nameRegex);
    if (nameMatch) {
      data.name = nameMatch[1].trim();
    }
    const dateTimeRegex = /(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/;
    const dateTimeMatch = text.match(dateTimeRegex);
    if (dateTimeMatch) {
      data.date = dateTimeMatch[1];
      data.time = dateTimeMatch[2];
    }
    const storeRegex = /LOCAL:\s*(.*)/i;
    const storeMatch = text.match(storeRegex);
    if (storeMatch) {
      data.store = storeMatch[1].trim();
    }
    const authCodeRegex = /PIS:\s*(\d+)/i;
    const authCodeMatch = text.match(authCodeRegex);
    if (authCodeMatch) {
      data.authCode = authCodeMatch[1].trim();
    }
    return data;
  };

  const checkIfDuplicate = async (data) => {
    console.log("Verificando duplicidade para:", data.name, data.date, data.time);
    const pontosRef = collection(db, 'pontos');
    const q = query(
      pontosRef,
      where('name', '==', data.name),
      where('date', '==', data.date),
      where('time', '==', data.time)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `comprovantes/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Imagem enviada para o Firebase Storage:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Erro ao enviar a imagem:", error);
      return null;
    }
  };

  const sendToFirestore = async (data, photoURL) => {
    try {
      const pontosCollection = collection(db, 'pontos');
      const [day, month, year] = data.date.split('/').map(Number);
      const [hours, minutes] = data.time.split(':').map(Number);
      const pointDateTime = new Date(year, month - 1, day, hours, minutes);

      let workdayDate = new Date(pointDateTime);
      if (hours >= 0 && hours < 6) {
        workdayDate.setDate(workdayDate.getDate() - 1);
      }

      await addDoc(pontosCollection, {
        ...data,
        timestamp_salvo: new Date().toISOString(),
        timestamp_ponto: pointDateTime.toISOString(),
        url_foto: photoURL,
        origem: 'foto',
        workday_date: workdayDate.toLocaleDateString('pt-BR'),
      });

      console.log("Dados enviados para o Firestore com sucesso!");
      return true;
    } catch (error) {
      console.error("Erro ao enviar dados para o Firestore:", error);
      return false;
    }
  };

  async function handleOpenCamera() {
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
  }

  async function handleTakePhoto() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        mute: true,
      });

      setCameraModalVisible(false);

      let imageUriToAnalyze = photo.uri;
      let base64ImageToAnalyze = photo.base64;

      // Primeiro, tentar encontrar a bounding box do documento
      const boundingBox = await findDocumentBoundingBox(photo.base64);

      if (boundingBox) {
        console.log("Bounding box encontrada:", boundingBox);
        const croppedImage = await manipulateAsync(
          photo.uri,
          [{
            crop: {
              originX: boundingBox.originX,
              originY: boundingBox.originY,
              width: boundingBox.width,
              height: boundingBox.height,
            }
          }],
          { compress: 1, format: SaveFormat.JPEG, base64: true } // Garantir que retorna base64
        );
        imageUriToAnalyze = croppedImage.uri;
        base64ImageToAnalyze = croppedImage.base64; // Atualizar o base64 para a imagem recortada
        console.log("Imagem recortada com sucesso.");
      } else {
        console.log("Não foi possível encontrar a bounding box, usando imagem original.");
      }

      const detectedText = await analyzeImage(base64ImageToAnalyze);
      const extracted = extractDataFromText(detectedText);

      setExtractedData({ ...extracted, photoUri: imageUriToAnalyze }); // Salvar a URI da imagem (original ou recortada)
      setOriginalExtractedData(extracted);
      setOriginalText(detectedText);
      setValidationModalVisible(true);
    }
  }

  async function handleConfirmData() {
    if (!extractedData.date || !extractedData.time) {
        Alert.alert("Erro", "Data ou hora não foram extraídas corretamente. Por favor, tente novamente ou insira manualmente.");
        setValidationModalVisible(false);
        return;
    }

    const finalData = { ...extractedData };
    if (finalData.date !== originalExtractedData.date || finalData.time !== originalExtractedData.time) {
        finalData.editado = true;
        finalData.data_original_ocr = originalExtractedData.date;
        finalData.hora_original_ocr = originalExtractedData.time;
    }

    const isDuplicate = await checkIfDuplicate(finalData);
    if (isDuplicate) {
        Alert.alert("Aviso", "Este comprovante já foi registrado!");
        setValidationModalVisible(false);
        return;
    }
    
    const photoURL = await uploadImage(finalData.photoUri);
    const success = await sendToFirestore(finalData, photoURL);

    if (success) {
      Alert.alert("Sucesso!", "Dados enviados com sucesso para o banco de dados.");
    } else {
      Alert.alert("Erro", "Falha ao enviar os dados. Verifique a conexão.");
    }
    
    setValidationModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenCamera}>
            <Text style={styles.actionButtonText}>Tirar Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ManualEntryScreen')}>
            <Text style={styles.actionButtonText}>Registrar Manualmente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('SummaryScreen')}>
            <Text style={styles.actionButtonText}>Ver Resumo</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={cameraModalVisible} style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          ref={cameraRef}
        />
        <View style={styles.footer}>
          <Button
            title="Tirar Foto"
            onPress={handleTakePhoto}
          />
          <Button
            title="Cancelar"
            onPress={() => setCameraModalVisible(false)}
          />
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
                value={extractedData.name}
                editable={false}
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
              title="Confirmar"
              onPress={handleConfirmData}
            />
            <Button
              title="Cancelar"
              onPress={() => setValidationModalVisible(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

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
  footer: {
    position: "absolute",
    bottom: 32,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
});