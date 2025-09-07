import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importe as telas
import HomeScreen from './HomeScreen';
import RegisterScreen from './RegisterScreen';
import ManualEntryScreen from './ManualEntryScreen';
import CameraScreen from './CameraScreen';
import ReportScreen from './ReportScreen';
import HistoryScreen from './HistoryScreen';

const Tab = createBottomTabNavigator();
const RegisterStack = createStackNavigator();

function RegisterStackScreen() {
  return (
    <RegisterStack.Navigator screenOptions={{ headerShown: false }}>
      <RegisterStack.Screen name="RegisterHome" component={RegisterScreen} />
      <RegisterStack.Screen name="ManualEntry" component={ManualEntryScreen} />
      <RegisterStack.Screen name="Tirar Foto" component={CameraScreen} />
    </RegisterStack.Navigator>
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
        <Tab.Screen name="Histórico" component={HistoryScreen} />
        <Tab.Screen name="Banco de Horas" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}