import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Importe as telas
import HomeScreen from './HomeScreen';
import RegisterSelectionScreen from './RegisterSelectionScreen';
import ManualEntryScreen from './ManualEntryScreen';
import CameraScreen from './CameraScreen';
import ReportScreen from './ReportScreen';
import HistorySelectionScreen from './HistorySelectionScreen';
import HistoryScreen from './HistoryScreen';
import SummaryScreen from './SummaryScreen';
import LoginScreen from './LoginScreen'; // Importe a nova tela de Login
import { auth } from './firebase_config'; // Importe o serviço de autenticação

const Tab = createBottomTabNavigator();
const RegisterStack = createStackNavigator();
const HistoryStack = createStackNavigator();

function RegisterStackScreen() {
  return (
    <RegisterStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterStack.Screen name="RegisterHome" component={RegisterSelectionScreen} />
      <RegisterStack.Screen name="ManualEntry" component={ManualEntryScreen} />
      <RegisterStack.Screen name="Tirar Foto" component={CameraScreen} />
    </RegisterStack.Navigator>
  );
}

function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryHome" component={HistorySelectionScreen} />
      <HistoryStack.Screen name="Registros Individuais" component={HistoryScreen} />
      <HistoryStack.Screen name="Resumo Mensal" component={SummaryScreen} />
    </HistoryStack.Navigator>
  );
}

// Este é o novo componente principal que gerencia o estado de autenticação
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener que verifica o estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Função de limpeza para evitar vazamento de memória
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Se o usuário não estiver logado, mostre a tela de login
  if (!user) {
    return (
      <NavigationContainer>
        <LoginScreen />
      </NavigationContainer>
    );
  }

  // Se o usuário estiver logado, mostre a navegação principal
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Início"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'Início') {
              iconName = 'home';
            } else if (route.name === 'Registrar') {
              iconName = 'add-task';
            } else if (route.name === 'Histórico') {
              iconName = 'history';
            } else if (route.name === 'Banco de Horas') {
              iconName = 'bar-chart';
            }
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: true, // Adiciona o cabeçalho para exibir o botão de Logout
        })}
      >
        <Tab.Screen name="Início" component={HomeScreen} 
          options={{
            headerRight: () => (
              <Button title="Logout" onPress={() => signOut(auth)} />
            ),
          }}
        />
        <Tab.Screen name="Registrar" component={RegisterStackScreen} />
        <Tab.Screen name="Histórico" component={HistoryStackScreen} />
        <Tab.Screen name="Banco de Horas" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}