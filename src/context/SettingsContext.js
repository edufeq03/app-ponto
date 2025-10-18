// src/context/SettingsContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../../config/firebase_config';
import { loadUserSettings, DEFAULT_SETTINGS } from '../../services/settingsService';
import { ActivityIndicator, View, Alert, Text } from 'react-native';

// 1. Criação do Contexto
const SettingsContext = createContext(null);

// 2. Hook Customizado para usar o Contexto
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};

// 3. O Componente Provedor
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // Função que carrega as configurações do Firestore
  const fetchSettings = async () => {
    if (!user) {
        setSettings(DEFAULT_SETTINGS); // Se não houver usuário logado, usa o padrão
        setLoading(false);
        return;
    }
    
    setLoading(true);
    try {
        const userSettings = await loadUserSettings();
        if (userSettings) {
             setSettings(userSettings);
             console.log("LOG CONTEXT: Configurações carregadas com sucesso para o Contexto.");
        } else {
             setSettings(DEFAULT_SETTINGS);
             Alert.alert("Atenção", "Não foi possível carregar as configurações do usuário. Usando valores padrão.");
        }
    } catch (error) {
        console.error("ERRO CONTEXT: Falha ao carregar configurações iniciais:", error);
        setSettings(DEFAULT_SETTINGS); 
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    // Recarrega as configurações toda vez que o provedor for montado (após login)
    fetchSettings();
  }, [user]);

  // A função saveSettings agora precisa atualizar o Firestore E o estado local
  const updateSettingsLocally = (newSettings) => {
    setSettings(newSettings);
  };

  // 4. Renderização do Provider
  if (loading || !settings) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#4a148c" />
            <Text style={{ marginTop: 10, color: '#4a148c' }}>Preparando configurações...</Text>
        </View>
    );
  }

  const contextValue = {
    settings,
    updateSettingsLocally, // Função para telas usarem após o salvamento no Firestore
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};