import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Button } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';

// Importe as telas
import HomeScreen from './screens/HomeScreen';
import RegisterSelectionScreen from './screens/RegisterSelectionScreen';
import ManualEntryScreen from './screens/ManualEntryScreen';
import CameraScreen from './screens/CameraScreen';
import ReportScreen from './screens/ReportScreen';
import HistorySelectionScreen from './screens/HistorySelectionScreen';
import HistoryScreen from './screens/HistoryScreen';
import SummaryScreen from './screens/SummaryScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';

// Dados para conexao Firebase
import { auth } from './config/firebase_config';

const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
const RegisterStack = createStackNavigator();
const HistoryStack = createStackNavigator();

// Navegador para as telas de login e cadastro
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

// Stack para a tela de registro de ponto (Manual ou Câmera)
function RegisterStackScreen() {
  return (
    <RegisterStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterStack.Screen name="Opções de Registro" component={RegisterSelectionScreen} />
      <RegisterStack.Screen name="Entrada Manual" component={ManualEntryScreen} />
      <RegisterStack.Screen name="Ponto por Foto" component={CameraScreen} />
    </RegisterStack.Navigator>
  );
}

// Stack para a tela de histórico
function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="Opções de Histórico" component={HistorySelectionScreen} />
      <HistoryStack.Screen name="Registros Individuais" component={HistoryScreen} />
      <HistoryStack.Screen name="Resumo Mensal" component={SummaryScreen} />
    </HistoryStack.Navigator>
  );
}

// O Navegador de abas principal
function MainAppTabs() {
  return (
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
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Início"
        component={HomeScreen}
        options={{
          headerRight: () => (
            <Button
              onPress={() => signOut(auth)}
              title="Sair"
              color="#007AFF"
            />
          ),
          headerTitle: 'Meu Ponto!',
        }}
      />
      <Tab.Screen name="Registrar" component={RegisterStackScreen} />
      <Tab.Screen name="Histórico" component={HistoryStackScreen} />
      <Tab.Screen name="Banco de Horas" component={ReportScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    'MaterialIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainAppTabs /> : <AuthStackScreen />}
    </NavigationContainer>
  );
}