import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Button, StyleSheet } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';

// Importe as telas
import HomeScreen from './screens/HomeScreen';
import RegisterSelectionScreen from './screens/RegisterSelectionScreen';
import ManualEntryScreen from './screens/ManualEntryScreen';
import CameraScreen from './screens/CameraScreen';
import ReportScreen from './screens/ReportScreen';
import HistorySelectionScreen from './screens/HistorySelectionScreen'; // Mantive caso use
import HistoryScreen from './screens/HistoryScreen';
import SummaryScreen from './screens/SummaryScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import TimeBankScreen from './screens/TimeBankScreen';
import SettingsScreen from './screens/SettingsScreen';
// NOVOS IMPORTS
import SplashScreen from './screens/SplashScreen'; // Sua tela de abertura
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'; // Sua tela de esqueci a senha

// Dados para conexao Firebase
import { auth } from './config/firebase_config';

const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
const RegisterStack = createStackNavigator();
const HistoryStack = createStackNavigator();
const BankStack = createStackNavigator();
const SettingsStack = createStackNavigator();

// ------------------------------------
// Stacks para navegação
// ------------------------------------

function RegisterStackScreen() {
  return (
    <RegisterStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterStack.Screen name="RegisterSelection" component={RegisterSelectionScreen} />
      <RegisterStack.Screen name="ManualEntry" component={ManualEntryScreen} />
      <RegisterStack.Screen name="Camera" component={CameraScreen} />
    </RegisterStack.Navigator>
  );
}

function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: true }}>
      {/* Aqui você pode ter o HistorySelectionScreen se ele for usado */}
      <HistoryStack.Screen 
        name="Histórico Detalhado" 
        component={HistoryScreen} 
        options={{ title: 'Histórico de Pontos' }} 
      />
    </HistoryStack.Navigator>
  );
}

function BankStackScreen() {
  return (
    <BankStack.Navigator screenOptions={{ headerShown: true }}>
      <BankStack.Screen name="Saldo Banco de Horas" component={TimeBankScreen} />
      <BankStack.Screen name="Relatório Detalhado" component={ReportScreen} />
    </BankStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: true }}>
      <SettingsStack.Screen name="Configurações do Usuário" component={SettingsScreen} />
      <SettingsStack.Screen name="Resumo Mensal" component={SummaryScreen} />
    </SettingsStack.Navigator>
  );
}

// STACK: Autenticação
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      {/* ROTA DE ESQUECI A SENHA */}
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// STACK: Telas Principais (Tab Navigator)
function MainAppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Início') {
            iconName = 'home';
          } else if (route.name === 'Registrar') {
            iconName = 'add-circle';
          } else if (route.name === 'Histórico') {
            iconName = 'history';
          } else if (route.name === 'Banco de Horas') {
            iconName = 'account-balance';
          } else if (route.name === 'Configurações') {
            iconName = 'settings';
          }

          // Você pode querer usar Ionicons aqui, dependendo do que está usando
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
      <Tab.Screen name="Banco de Horas" component={BankStackScreen} />
      <Tab.Screen name="Configurações" component={SettingsStackScreen} />
    </Tab.Navigator>
  );
}


// ------------------------------------
// Componente Principal App
// ------------------------------------

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'MaterialIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  });

  useEffect(() => {
    // VARIÁVEIS DE CONTROLE DE TEMPO MÍNIMO DA SPLASH
    const MIN_SPLASH_TIME = 2000; // 2 segundos
    let firebaseCheckComplete = false;
    let timerComplete = false;
    
    // 1. CHECAGEM DO FIREBASE
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      firebaseCheckComplete = true;
      
      // Se o tempo mínimo já passou, podemos desativar o loading imediatamente
      if (timerComplete) {
        setLoading(false);
      }
    });

    // 2. TEMPO MÍNIMO DO SPLASH
    const timer = setTimeout(() => {
      timerComplete = true;
      // Se a checagem do Firebase já terminou, podemos desativar o loading imediatamente
      if (firebaseCheckComplete) {
        setLoading(false);
      }
    }, MIN_SPLASH_TIME);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);


  if (loading || !fontsLoaded) {
    // Exibe a tela de abertura enquanto o carregamento ou o tempo mínimo não terminam
    return (
      <SplashScreen /> 
    );
  }

  // Depois que o carregamento termina e o tempo mínimo passa, decide a navegação
  return (
    <NavigationContainer>
      {user ? <MainAppTabs /> : <AuthStackScreen />}
    </NavigationContainer>
  );
}