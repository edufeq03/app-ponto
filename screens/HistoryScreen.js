import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, Modal } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HistoryScreen = ({ navigation }) => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
              Alert.alert("Sucesso", "O registro de ponto foi excluído.");
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
    const user = auth.currentUser;
    if (!user) {
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    const userId = user.uid;
    
    const pointsQuery = query(
      collection(db, 'pontos'),
      where('usuario_id', '==', userId),
      orderBy('timestamp_ponto', 'desc')
    );

    const unsubscribe = onSnapshot(pointsQuery, (snapshot) => {
      if (!isMounted.current) return;

      const fetchedPoints = snapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp = null;
        
        if (data.timestamp_ponto && typeof data.timestamp_ponto.toDate === 'function') {
          timestamp = data.timestamp_ponto.toDate();
        } else {
          console.warn(`[AVISO] Documento com ID ${doc.id} tem timestamp_ponto inválido. Valor:`, data.timestamp_ponto);
        }

        return {
          id: doc.id,
          ...data,
          timestamp_ponto: timestamp
        };
      });
      setPoints(fetchedPoints);
      setLoading(false);
    }, (error) => {
      if (!isMounted.current) return;
      console.error("Erro ao buscar dados:", error);
      setLoading(false);
      Alert.alert("Erro", "Não foi possível carregar os registros de ponto.");
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => {
    return (
      <View style={styles.pointItem}>
        <View style={styles.textContainer}>
          <Text style={styles.itemText}>Origem: {item.origem === 'camera' ? 'Câmera' : 'Manual'}</Text>
          <Text style={styles.itemText}>Justificativa: {item.justificativa}</Text>
          <Text style={styles.timestampText}>
            {item.timestamp_ponto ? new Date(item.timestamp_ponto).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Data inválida'}
          </Text>
        </View>
        <View style={styles.actionsContainer}>
          {item.image_url && (
            <TouchableOpacity onPress={() => handleViewImage(item.image_url)}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeletePoint(item.id)}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Meu Histórico de Pontos</Text>
      {points.length > 0 ? (
        <FlatList
          data={points}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      ) : (
        <Text style={styles.noDataText}>Nenhum registro de ponto encontrado.</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
            )}
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Fechar</Text>
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
    gap: 10,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  fullImage: {
    width: 300,
    height: 400,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default HistoryScreen;