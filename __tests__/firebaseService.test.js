import { savePointData } from '../services/firebaseService';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../config/firebase_config';

// Mocks das funções do Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  addDoc: jest.fn(),
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));
jest.mock('../config/firebase_config', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
  db: {},
  storage: {},
}));

// Mock global para o fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve('mock_blob_data'),
  })
);

describe('firebaseService', () => {
  const mockPhotoUri = 'file://path/to/test-photo.jpg';
  const mockPointData = {
    origem: 'manual',
    justificativa: 'Teste de justificativa',
  };

  it('deve salvar a imagem no storage e o ponto no firestore com sucesso', async () => {
    console.log('--- Passo 1: Iniciando o teste de sucesso ---');

    // Mocar o retorno da URL de download da imagem
    getDownloadURL.mockResolvedValue('http://mocked-image-url.jpg');

    console.log('Passo 2: Chamando a função savePointData.');
    await savePointData(mockPhotoUri, mockPointData);

    console.log('Passo 3: Verificando as chamadas do Firebase.');

    // Verificação 1: O fetch foi chamado? (agora simulado)
    expect(global.fetch).toHaveBeenCalledWith(mockPhotoUri);
    console.log('   ✔ `fetch` foi chamado corretamente.');

    // Verificação 2: A imagem foi enviada corretamente?
    expect(uploadBytes).toHaveBeenCalled();
    console.log('   ✔ `uploadBytes` foi chamado.');

    // Verificação 3: A URL de download foi obtida?
    expect(getDownloadURL).toHaveBeenCalled();
    console.log('   ✔ `getDownloadURL` foi chamado.');

    // Verificação 4: O documento foi adicionado ao Firestore com os dados corretos?
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ...mockPointData,
        image_url: 'http://mocked-image-url.jpg',
        usuario_id: 'test-user-123',
      })
    );
    console.log('   ✔ `addDoc` foi chamado com os dados e a URL da imagem corretos.');
    console.log('Passo 4: Verificações completas. Teste de sucesso concluído!');
  });

  it('deve lançar um erro se o usuário não estiver autenticado', async () => {
    console.log('--- Passo 1: Iniciando o teste de usuário não autenticado ---');

    // Mocar a autenticação para não ter um usuário logado
    auth.currentUser = null;

    console.log('Passo 2: Chamando a função e esperando o erro.');
    await expect(savePointData(mockPhotoUri, mockPointData)).rejects.toThrow('Usuário não autenticado. Por favor, faça login novamente.');
    console.log('   ✔ A função lançou o erro esperado. Teste de falha concluído!');
  });
});