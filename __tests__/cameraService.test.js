import { processImageWithVision } from '../services/cameraService';
import { GOOGLE_CLOUD_VISION_API_KEY } from '../config/api_config';
import { manipulateAsync } from 'expo-image-manipulator';
import axios from 'axios';

// Mock da biblioteca expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => ({ base64: 'mocked_base64_image' })),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock da biblioteca axios
jest.mock('axios');

// Mock da chave da API para o teste
jest.mock('../config/api_config', () => ({
  GOOGLE_CLOUD_VISION_API_KEY: 'test_api_key',
}));

describe('cameraService', () => {
  it('deve processar a imagem e retornar o texto detectado com sucesso', async () => {
    console.log('--- Passo 1: Iniciando o teste de sucesso ---');

    // Mocar a resposta bem-sucedida da API do Google Vision
    axios.post.mockResolvedValue({
      data: {
        responses: [{
          fullTextAnnotation: {
            text: 'Texto detectado com sucesso',
          },
        }],
      },
    });

    console.log('Passo 2: Chamando a função processImageWithVision.');
    const imageUri = 'file://path/to/mocked-image.jpg';
    const result = await processImageWithVision(imageUri);

    console.log('Passo 3: Verificando as chamadas e o resultado.');

    // Verificação 1: A função de manipulação da imagem foi chamada corretamente?
    expect(manipulateAsync).toHaveBeenCalledWith(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.7, format: 'jpeg', base64: true }
    );
    console.log('   ✔ `manipulateAsync` foi chamado corretamente.');

    // Verificação 2: A chamada à API do Google Vision foi feita corretamente?
    expect(axios.post).toHaveBeenCalledWith(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      expect.any(Object)
    );
    console.log('   ✔ `axios.post` foi chamado com a URL e corpo corretos.');

    // Verificação 3: O resultado da função é o texto esperado?
    expect(result).toBe('Texto detectado com sucesso');
    console.log('   ✔ O resultado foi o texto esperado. Teste de sucesso completo!');
  });

  it('deve lançar um erro quando a requisição à API do Google Vision falha', async () => {
    console.log('--- Passo 1: Iniciando o teste de falha ---');

    // Mocar a resposta de falha da API
    axios.post.mockRejectedValue(new Error('Network request failed'));

    console.log('Passo 2: Chamando a função e esperando o erro.');
    const imageUri = 'file://path/to/mocked-image.jpg';

    // Verificação: A função lança um erro?
    await expect(processImageWithVision(imageUri)).rejects.toThrow('Erro na API do Google Vision: Network request failed');
    console.log('   ✔ A função lançou o erro esperado. Teste de falha completo!');
  });
});