// src/screens/LegalReferenceScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

// Importa o novo serviço
import { loadLegalReferences } from '../services/contentService'; 

const { width } = Dimensions.get('window');

const LegalReferenceScreen = () => {
    const [loading, setLoading] = useState(true);
    const [references, setReferences] = useState(null);
    const [videoLoading, setVideoLoading] = useState(true);

    useEffect(() => {
        const fetchReferences = async () => {
            setLoading(true);
            const data = await loadLegalReferences();
            setReferences(data);
            setLoading(false);
        };
        fetchReferences();
    }, []);

    const handleWebError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        Alert.alert(
            "Erro de Carregamento do Vídeo", 
            `Não foi possível carregar o player. Mensagem: ${nativeEvent.description}`
        );
        console.error("WebView Error:", nativeEvent);
        setVideoLoading(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a148c" />
                <Text style={styles.loadingText}>Carregando conteúdo legal...</Text>
            </View>
        );
    }
    
    // Fallback para o caso de falha total de carregamento
    const videoTitle = references?.video_title || "Conteúdo Sugerido";
    const videoId = references?.video_id;
    const cltLink = references?.clt_link || 'https://www.google.com/search?q=clt';

    const youtubeUrl = videoId 
        ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`
        : null;


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <Text style={styles.header}>Referências Legais e Conteúdo</Text>
                
                {/* --- SEÇÃO DO VÍDEO DO YOUTUBE --- */}
                <View style={styles.videoContainer}>
                    <Text style={styles.subHeader}>Vídeo: {videoTitle}</Text>
                    
                    {youtubeUrl ? (
                        <View>
                            {videoLoading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#4a148c" />
                                    <Text style={styles.loadingText}>Carregando player...</Text>
                                </View>
                            )}

                            <WebView
                                style={styles.webView}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                source={{ uri: youtubeUrl }}
                                allowsFullscreenVideo={true}
                                onLoadStart={() => setVideoLoading(true)}
                                onLoadEnd={() => setVideoLoading(false)}
                                onError={handleWebError}
                            />
                            
                            <TouchableOpacity 
                                style={styles.openInAppButton}
                                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
                            >
                                <Ionicons name="logo-youtube" size={20} color="#fff" />
                                <Text style={styles.openInAppText}> Abrir no App do YouTube</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.articleContent}>Link do vídeo indisponível no momento.</Text>
                    )}
                </View>

                {/* --- SEÇÃO DE REFERÊNCIAS LEGAIS (CONTEÚDO ESTATICO) --- */}
                <View style={styles.referencesContainer}>
                    <Text style={styles.subHeader}>Artigos Chave da CLT</Text>
                    
                    {/* Conteúdo estático da CLT mantido para garantia */}
                    <Text style={styles.articleTitle}>Art. 58 - Duração do Trabalho</Text>
                    <Text style={styles.articleContent}>
                        A duração normal do trabalho, para os empregados em qualquer atividade privada, 
                        não excederá a oito horas diárias, desde que não seja fixado expressamente outro limite.
                    </Text>

                    <Text style={styles.articleTitle}>Art. 71 - Intervalo Intrajornada (Almoço)</Text>
                    <Text style={styles.articleContent}>
                        Em qualquer trabalho contínuo cuja duração exceda de 6 (seis) horas, é obrigatória a concessão 
                        de um intervalo para repouso ou alimentação de, no mínimo, 1 (uma) hora.
                    </Text>
                    
                    {/* Botão de Link para o site da CLT ou blog (busca do Firestore) */}
                    <TouchableOpacity 
                        style={styles.linkButton}
                        onPress={() => Linking.openURL(cltLink)}
                    >
                        <Ionicons name="document-text-outline" size={20} color="#4a148c" />
                        <Text style={styles.linkButtonText}> Ver a CLT na íntegra (Link Dinâmico)</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
    container: { flex: 1, padding: 15 },
    header: { fontSize: 26, fontWeight: 'bold', color: '#4a148c', marginBottom: 20, textAlign: 'center' },
    subHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 10 },
    
    // Estilos para o Vídeo
    videoContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 3 },
    webView: { width: '100%', height: width * 0.5625, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 10, borderRadius: 8 },
    loadingText: { marginTop: 5, color: '#4a148c', fontWeight: 'bold' },
    openInAppButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff0000', padding: 8, borderRadius: 5, marginTop: 10 },
    openInAppText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
    
    // Estilos para Referências
    referencesContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 20, elevation: 3 },
    articleTitle: { fontSize: 16, fontWeight: 'bold', color: '#6a1b9a', marginTop: 10, marginBottom: 3 },
    articleContent: { fontSize: 14, color: '#555', marginBottom: 10, lineHeight: 20, textAlign: 'justify' },
    linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e1bee7', padding: 10, borderRadius: 5, marginTop: 15 },
    linkButtonText: { fontSize: 16, color: '#4a148c', fontWeight: 'bold', marginLeft: 5 },
    
    // Estilos de Carregamento
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
});

export default LegalReferenceScreen;