import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importe as telas
import HomeScreen from './HomeScreen';
import ManualEntryScreen from './ManualEntryScreen';
import CameraScreen from './CameraScreen';
import ReportScreen from './ReportScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Registrar') {
              iconName = 'edit';
            } else if (route.name === 'Tirar Foto') {
              iconName = 'camera-alt';
            } else if (route.name === 'Relatório') {
              iconName = 'bar-chart';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Registrar" component={ManualEntryScreen} />
        <Tab.Screen name="Tirar Foto" component={CameraScreen} />
        <Tab.Screen name="Relatório" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}