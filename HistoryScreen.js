import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, Modal } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase_config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HistoryScreen = ({ navigation }) => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleDeletePoint = async (pointId) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza de que deseja excluir este registro de ponto?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Excluir",
          onPress: async () => {
            try {
              const pointDoc = doc(db, 'pontos', pointId);
              await deleteDoc(pointDoc);
              console.log("Ponto excluído com sucesso!");
            } catch (error) {
              console.error("Erro ao excluir o ponto:", error);
              Alert.alert("Erro", "Não foi possível excluir o ponto. Tente novamente.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleViewImage = (imageURL) => {
    setSelectedImage(imageURL);
    setModalVisible(true);
  };

  useEffect(() => {
    const q = query(collection(db, 'pontos'), orderBy('timestamp_ponto', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPoints = [];
      querySnapshot.forEach((doc) => {
        fetchedPoints.push({ id: doc.id, ...doc.data() });
      });
      setPoints(fetchedPoints);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar pontos do Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.header}>Histórico de Pontos</Text>
      {points.length === 0 ? (
        <Text style={styles.noDataText}>Nenhum ponto registrado ainda.</Text>
      ) : (
        <FlatList
          data={points}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.pointItem}>
              <View style={styles.textContainer}>
                {item.store && <Text style={styles.itemText}>Local: {item.store}</Text>}
                {item.name && <Text style={styles.itemText}>Nome: {item.name}</Text>}
                {item.date && item.time && <Text style={styles.itemText}>Data/Hora: {item.date} {item.time}</Text>}
                {item.authCode && <Text style={styles.itemText}>PIS: {item.authCode}</Text>}
                {item.justificativa && <Text style={styles.itemText}>Justificativa: {item.justificativa}</Text>}
                <Text style={styles.timestampText}>Registrado em: {new Date(item.timestamp_salvo).toLocaleString()}</Text>
              </View>
              <View style={styles.actionsContainer}>
                {item.url_foto && (
                  <TouchableOpacity onPress={() => handleViewImage(item.url_foto)}>
                      <Ionicons name="image-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {item.origem === 'manual' && (
                    <View style={styles.manualIcon}>
                        <Ionicons name="create-outline" size={24} color="gray" />
                    </View>
                )}
                <TouchableOpacity onPress={() => handleDeletePoint(item.id)}>
                    <Ionicons name="trash" size={24} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.modalView}>
          <Image
            style={styles.fullImage}
            source={{ uri: selectedImage }}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(!modalVisible)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#333',
  },
  pointItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 3,
    color: '#555',
  },
  timestampText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: '#777',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualIcon: {
    // Estilos para o ícone de edição (caneta) - pode deixar vazio ou adicionar mais se quiser
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
});

export default HistoryScreen;