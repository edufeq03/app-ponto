import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, Modal, Linking, Button, SafeAreaView } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDocs } from 'firebase/firestore';

const HistoryScreen = () => {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const formatMonthYear = (date) => {
      return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const handlePreviousMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
            return newDate;
        });
    };

    useFocusEffect(
      React.useCallback(() => {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Erro", "Usuário não autenticado.");
          setLoading(false);
          return;
        }

        // Definir o intervalo de tempo para o mês selecionado
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

        // O Firebase compara strings ISO.
        const startIso = startOfMonth.toISOString();
        const endIso = endOfMonth.toISOString();


        const q = query(
          collection(db, 'pontos'),
          where('usuario_id', '==', user.uid),
          where('timestamp_ponto', '>=', startIso),
          where('timestamp_ponto', '<=', endIso),
          orderBy('timestamp_ponto', 'desc')
        );

        setLoading(true); // Mostrar loading ao mudar de mês

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const pointsList = [];
          querySnapshot.forEach(doc => {
            pointsList.push({ id: doc.id, ...doc.data() });
          });
          setPoints(pointsList);
          setLoading(false);
        }, (error) => {
          console.error("Erro ao carregar dados em tempo real:", error);
          setLoading(false);
          Alert.alert("Erro de Conexão", "Não foi possível carregar o histórico. Tente novamente.");
        });

        return () => unsubscribe();
      }, [currentMonth]) // Re-executa o effect quando currentMonth mudar
    );

    const handleClearData = async () => {
      Alert.alert(
        "Aviso de Limpeza",
        "Tem certeza que deseja deletar TODOS os pontos de registro? Esta ação é irreversível.",
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          {
            text: "Deletar Tudo",
            onPress: async () => {
              const success = await clearAllPoints();
              if (success) {
                Alert.alert("Sucesso", "Todos os pontos foram deletados.");
              } else {
                Alert.alert("Erro", "Falha ao deletar os pontos.");
              }
            },
            style: "destructive"
          }
        ]
      );
    };

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

  const handleViewImage = (imageUrl) => {
    setCurrentImage(imageUrl);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    const pointDateTime = new Date(item.timestamp_ponto);
    const formattedDate = pointDateTime.toLocaleDateString('pt-BR');
    const formattedTime = pointDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // LÓGICA DE FALLBACK: Verifica se existe 'image_url' (novo) ou 'url_foto' (antigo)
    // Isso garante a compatibilidade retroativa.
    const imageUrl = item.image_url || item.url_foto;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.itemText}><Text style={styles.label}>Data:</Text> {formattedDate}</Text>
          <Text style={styles.itemText}><Text style={styles.label}>Hora:</Text> {formattedTime}</Text>
          {(item.origem === 'foto' && item.justificativa_ocr) && (
            <Text style={styles.itemText}>
              <Text style={styles.label}>Justificativa:</Text> {item.justificativa_ocr}
            </Text>
          )}
          {(item.origem === 'manual' && item.justificativa) && (
            <Text style={styles.itemText}>
              <Text style={styles.label}>Justificativa:</Text> {item.justificativa}
            </Text>
          )}
        </View>
        <View style={styles.actionsContainer}>
          {/* Usa a variável imageUrl com a lógica de fallback */}
          {item.origem === 'foto' && imageUrl && (
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => handleViewImage(imageUrl)}
            >
              <Ionicons name="image" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeletePoint(item.id)}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

    const MonthSelector = () => (
        <View style={styles.monthSelectorContainer}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{formatMonthYear(currentMonth).toUpperCase()}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Carregando histórico...</Text>
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Histórico de Pontos</Text>
        
        <MonthSelector /> 

        <FlatList
          data={points}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>Nenhum ponto registrado neste mês.</Text>}
          style={styles.list}
        />
        {__DEV__ && (
          <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearData}
          >
              <Ionicons name="trash-bin-outline" size={24} color="#fff" />
              <Text style={styles.clearAllButtonText}>Limpar Todos os Pontos</Text>
          </TouchableOpacity>
        )}
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
                setModalVisible(!modalVisible);
            }}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {currentImage && (
                        <Image
                            source={{ uri: currentImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </View>
        </Modal>
      </SafeAreaView>
    );
}

const clearAllPoints = async () => {
  // ... (função clearAllPoints permanece a mesma)
  console.log("LOG: Iniciando a limpeza de todos os pontos do usuário para desenvolvimento...");
  const user = auth.currentUser;
  if (!user) {
      console.error("ERRO: Usuário não autenticado.");
      return false;
  }

  try {
      const pontosRef = collection(db, 'pontos');
      const q = query(pontosRef, where('usuario_id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          console.log("LOG: Nenhumn ponto encontrado para o usuário. Nenhuma limpeza necessária.");
          return true;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(docSnapshot => {
          batch.delete(doc(db, 'pontos', docSnapshot.id));
      });

      await batch.commit();
      console.log(`LOG: ${querySnapshot.size} pontos deletados com sucesso.`);
      return true;
  } catch (error) {
      console.error("ERRO: Falha ao limpar os pontos:", error);
      return false;
  }
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  monthButton: {
    padding: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
  },
  imageButton: {
    padding: 8,
    borderRadius: 5,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    width: '95%',
    height: '80%',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  clearAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'red',
      padding: 15,
      borderRadius: 10,
      marginTop: 20,
  },
  clearAllButtonText: {
      color: 'white',
      fontWeight: 'bold',
      marginLeft: 10,
      fontSize: 16,
  },
});

export default HistoryScreen;