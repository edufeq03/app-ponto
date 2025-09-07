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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pointsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp_ponto: new Date(doc.data().timestamp_ponto).toLocaleString('pt-BR')
      }));
      setPoints(pointsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Histórico de Pontos</Text>
      <FlatList
        data={points}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.pointItem}>
            <View style={styles.textContainer}>
              <Text style={styles.itemText}>Data: {item.timestamp_ponto.split(',')[0]}</Text>
              <Text style={styles.itemText}>Hora: {item.timestamp_ponto.split(',')[1]}</Text>
              <Text style={styles.itemText}>Origem: {item.origem}</Text>
              {item.justificativa && (
                <Text style={styles.itemText}>Justificativa: {item.justificativa}</Text>
              )}
            </View>
            <View style={styles.actionsContainer}>
              {item.image_url && (
                <TouchableOpacity onPress={() => handleViewImage(item.image_url)}>
                  <Ionicons name="image" size={24} color="#007AFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDeletePoint(item.id)}>
                <Ionicons name="trash" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noDataText}>Nenhum ponto registrado.</Text>}
      />
      
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close-circle" size={30} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    gap: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    width: '90%',
    height: '90%',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});

export default HistoryScreen;