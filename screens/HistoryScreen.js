import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image, Modal, Linking, Button } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase_config';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';

const HistoryScreen = () => {
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
      React.useCallback(() => {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Erro", "Usuário não autenticado.");
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, 'pontos'),
          where('usuario_id', '==', user.uid),
          orderBy('timestamp_ponto', 'desc')
        );

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
      }, [])
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

    const renderItem = ({ item }) => (
      <View style={styles.itemContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.itemText}><Text style={styles.label}>Data:</Text> {item.date}</Text>
          <Text style={styles.itemText}><Text style={styles.label}>Hora:</Text> {item.time}</Text>
          <Text style={styles.itemText}><Text style={styles.label}>Nome:</Text> {item.name || 'Não detectado'}</Text>
        </View>
        <View style={styles.actionsContainer}>
          {item.url_foto && (
              <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => Linking.openURL(item.url_foto)}
              >
                  <Icon name="image" size={24} color="#007AFF" />
              </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDeletePoint(item.id)}>
              <Icon name="delete" size={24} color="red" />
          </TouchableOpacity>
        </View>
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
      <View style={styles.container}>
        <Text style={styles.title}>Histórico de Pontos</Text>
        <FlatList
          data={points}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>Nenhum ponto registrado ainda.</Text>}
          style={styles.list}
        />
        {__DEV__ && (
          <View style={styles.buttonContainer}>
            <Button
              title="Limpar todos os dados de ponto"
              onPress={handleClearData}
              color="red"
            />
          </View>
        )}
      </View>
    );
}

const clearAllPoints = async () => {
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 5,
  },
  imageButtonText: {
    marginLeft: 5,
    color: '#007AFF',
    fontWeight: 'bold',
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
});

export default HistoryScreen;