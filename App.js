import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button, Platform } from 'react-native';

import CameraScreen from './CameraScreen';
import HistoryScreen from './HistoryScreen';
import ManualEntryScreen from './ManualEntryScreen';
import SummaryScreen from './SummaryScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CameraScreen">
        <Stack.Screen 
          name="CameraScreen" 
          component={CameraScreen} 
          options={{ title: 'Registro de Ponto' }} 
        />
        <Stack.Screen 
          name="ManualEntryScreen" 
          component={ManualEntryScreen} 
          options={{ title: 'Registro Manual' }} 
        />
        <Stack.Screen 
          name="SummaryScreen" 
          component={SummaryScreen} 
          options={({ navigation }) => ({
            title: 'Resumo Mensal',
            headerRight: () => (
              <Button
                onPress={() => navigation.navigate('HistoryScreen')}
                title="Histórico"
                color={Platform.OS === 'ios' ? '#007AFF' : '#000'} // Corrigido para preto em Android
              />
            ),
          })}
        />
        <Stack.Screen
          name="HistoryScreen"
          component={HistoryScreen}
          options={{ title: 'Histórico de Pontos' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}