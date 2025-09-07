import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importe todas as telas necessárias
import HomeScreen from './HomeScreen';
import RegisterScreen from './RegisterScreen'; // Tela de seleção para o registro
import ManualEntryScreen from './ManualEntryScreen';
import CameraScreen from './CameraScreen';
import ReportScreen from './ReportScreen';
import HistorySelectionScreen from './HistorySelectionScreen'; // Tela de seleção para o histórico
import HistoryScreen from './HistoryScreen'; // Histórico de pontos individuais
import SummaryScreen from './SummaryScreen'; // Resumo mensal

const Tab = createBottomTabNavigator();
const RegisterStack = createStackNavigator();
const HistoryStack = createStackNavigator();

// Stack Navigator para o menu "Registrar"
function RegisterStackScreen() {
  return (
    <RegisterStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterStack.Screen name="RegisterHome" component={RegisterScreen} />
      <RegisterStack.Screen name="ManualEntry" component={ManualEntryScreen} />
      <RegisterStack.Screen name="Tirar Foto" component={CameraScreen} />
    </RegisterStack.Navigator>
  );
}

// Stack Navigator para o menu "Histórico"
function HistoryStackScreen() {
  return (
    <HistoryStack.Navigator screenOptions={{ headerShown: false }}>
      <HistoryStack.Screen name="HistoryHome" component={HistorySelectionScreen} />
      <HistoryStack.Screen name="Registros Individuais" component={HistoryScreen} />
      <HistoryStack.Screen name="Resumo Mensal" component={SummaryScreen} />
    </HistoryStack.Navigator>
  );
}

export default function App() {
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
          headerShown: false,
        })}
      >
        <Tab.Screen name="Início" component={HomeScreen} />
        <Tab.Screen name="Registrar" component={RegisterStackScreen} />
        <Tab.Screen name="Histórico" component={HistoryStackScreen} />
        <Tab.Screen name="Banco de Horas" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}