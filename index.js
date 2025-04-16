import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import promptSync from 'prompt-sync';

const prompt = promptSync({ sigint: true });

// Endpoint QuickNode para a rede Solana Devnet
const QUICKNODE_ENDPOINT = "https://wandering-muddy-feather.solana-devnet.quiknode.pro/0c1121626d0aa66795777b6e2da00319c18486ce/";

// Função para gerar uma URL para o explorador Solana
function getSolanaExplorerUrl(address) {
  const baseUrl = 'https://explorer.solana.com/address/';
  return `${baseUrl}${address}?cluster=devnet`;
}

// Função para obter a conexão com a rede Solana
function getConnection() {
  console.log(`Conectando à rede Solana Devnet usando QuickNode...`);
  return new Connection(QUICKNODE_ENDPOINT, 'confirmed');
}

// Variáveis globais
let connection;

// Função para adicionar timeout a uma promessa
function withTimeout(promise, timeoutMs) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operação excedeu o tempo limite de ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

// Função para criar uma nova carteira
function createWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: bs58.encode(keypair.secretKey)
  };
}

// Função para solicitar SOL do faucet da Devnet
async function requestAirdrop(publicKey, amount = 2) {
  try {
    console.log(`Solicitando ${amount} SOL do faucet da Devnet para ${publicKey}...`);
    const airdropSignature = await connection.requestAirdrop(
      new PublicKey(publicKey),
      amount * LAMPORTS_PER_SOL
    );
    
    // Aguardar a confirmação do airdrop
    console.log('Aguardando confirmação do airdrop...');
    await connection.confirmTransaction(airdropSignature);
    
    // Verificar o novo saldo
    const balance = await connection.getBalance(new PublicKey(publicKey));
    console.log(`Airdrop concluído! Novo saldo: ${balance / LAMPORTS_PER_SOL} SOL`);
    return true;
  } catch (error) {
    console.error('Erro ao solicitar SOL do faucet:', error);
    return false;
  }
}

// Função para transferir SOL
async function transferSOL(fromWallet, toPublicKey, amount) {
  try {
    const fromPublicKey = new PublicKey(fromWallet.publicKey);
    const destinationPublicKey = new PublicKey(toPublicKey);
    
    console.log(`Preparando transação de ${amount} SOL de ${fromPublicKey.toString()} para ${destinationPublicKey.toString()}...`);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: destinationPublicKey,
        lamports: amount * LAMPORTS_PER_SOL
      })
    );
    
    const secretKeyDecoded = bs58.decode(fromWallet.secretKey);
    const signerKeypair = Keypair.fromSecretKey(secretKeyDecoded);
    
    // Usar timeout para evitar que a operação fique presa
    console.log('Enviando transação com timeout de 30 segundos...');
    const signature = await withTimeout(
      sendAndConfirmTransaction(
        connection,
        transaction,
        [signerKeypair]
      ),
      30000 // 30 segundos de timeout
    );
    
    return signature;
  } catch (error) {
    if (error.message && error.message.includes('tempo limite')) {
      console.error('Erro ao transferir SOL: Operação excedeu o tempo limite');
    } else {
      console.error('Erro ao transferir SOL:', error);
    }
    throw error;
  }
}

// Função para salvar as carteiras em um arquivo
function saveWallets(wallets, filename) {
  try {
    fs.writeFileSync(filename, JSON.stringify(wallets, null, 2));
    console.log(`Carteiras salvas com sucesso em ${filename}`);
  } catch (error) {
    console.error('Erro ao salvar carteiras:', error);
  }
}

// Função para verificar o saldo de uma carteira
async function checkWalletBalance(publicKey) {
  try {
    const pubKey = new PublicKey(publicKey);
    // Adicionar timeout para evitar que a operação fique presa
    const balance = await withTimeout(
      connection.getBalance(pubKey),
      10000 // 10 segundos de timeout
    );
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error(`Erro ao verificar saldo da carteira ${publicKey}:`, error.message || error);
    return -1; // Indica erro
  }
}

// Função para verificar o saldo de todas as carteiras criadas
async function checkAllWallets(wallets) {
  console.log('\n=== Verificando saldo das carteiras criadas ===');
  console.log('Nota: Se não conseguirmos verificar o saldo via API, forneceremos links para o explorador Solana.');
  
  let anySuccess = false;
  
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    console.log(`\nCarteira ${i+1} (${wallet.publicKey}):`);
    
    // Fornecer link para o explorador Solana
    const explorerUrl = getSolanaExplorerUrl(wallet.publicKey);
    console.log(`Link para explorador: ${explorerUrl}`);
    
    // Verificar o saldo
    const balance = await checkWalletBalance(wallet.publicKey);
    
    if (balance >= 0) {
      anySuccess = true;
      console.log(`Saldo atual: ${balance} SOL`);
      
      // Atualizar o status da transferência se o saldo for maior que zero
      if (balance > 0 && !wallet.transferSuccess) {
        console.log('Transferência detectada! Atualizando status...');
        wallet.transferSuccess = true;
        wallet.amount = balance; // Atualizar com o valor real
      }
    } else {
      console.log('Não foi possível verificar o saldo via API.');
      console.log('Por favor, verifique o saldo usando o link do explorador fornecido acima.');
    }
  }
  
  // Salvar as carteiras com informações atualizadas
  saveWallets(wallets, 'solana_wallets.json');
  
  if (!anySuccess) {
    console.log('\nNão foi possível verificar o saldo de nenhuma carteira via API.');
    console.log('Por favor, use os links do explorador Solana fornecidos acima para verificar os saldos manualmente.');
  } else {
    console.log('\nInformações das carteiras atualizadas com os saldos verificados.');
  }
}

// Função principal
async function main() {
  console.log('=== Bot de Criação de Carteiras Solana ===');
  console.log('----------------------------------------');
  
  // Inicializar a conexão com a rede Solana Devnet
  connection = getConnection();
  console.log('Usando rede: DEVNET');
  
  // Solicitar a chave secreta da carteira principal
  const secretKeyInput = prompt('Digite a chave secreta da carteira principal: ');
  
  let mainWallet;
  try {
    // Decodificar a chave secreta e criar o objeto da carteira principal
    const secretKeyDecoded = bs58.decode(secretKeyInput);
    const keypair = Keypair.fromSecretKey(secretKeyDecoded);
    mainWallet = {
      publicKey: keypair.publicKey.toString(),
      secretKey: secretKeyInput
    };
    console.log(`Carteira principal carregada: ${mainWallet.publicKey}`);
    
    // Verificar o saldo da carteira principal
    let balance = await connection.getBalance(new PublicKey(mainWallet.publicKey));
    console.log(`Saldo da carteira principal: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    // Se o saldo for insuficiente, solicitar SOL do faucet
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log('Saldo insuficiente na carteira principal para transferências.');
      console.log('Solicitando SOL do faucet da Devnet...');
      
      const airdropSuccess = await requestAirdrop(mainWallet.publicKey, 2);
      
      if (airdropSuccess) {
        // Atualizar o saldo após o airdrop
        balance = await connection.getBalance(new PublicKey(mainWallet.publicKey));
        console.log(`Novo saldo da carteira principal: ${balance / LAMPORTS_PER_SOL} SOL`);
      } else {
        console.log('Não foi possível obter SOL do faucet. As transferências podem falhar devido a saldo insuficiente.');
      }
    }
    
  } catch (error) {
    console.error('Erro ao carregar a carteira principal:', error);
    return;
  }
  
  // Solicitar o número de carteiras a serem criadas
  const numWallets = parseInt(prompt('Quantas carteiras você deseja criar? '));
  if (isNaN(numWallets) || numWallets <= 0) {
    console.error('Número inválido de carteiras.');
    return;
  }
  
  // Solicitar o valor a ser transferido para cada carteira
  const amountPerWallet = parseFloat(prompt('Quanto SOL você deseja transferir para cada carteira? '));
  if (isNaN(amountPerWallet) || amountPerWallet <= 0) {
    console.error('Valor inválido para transferência.');
    return;
  }
  
  console.log(`Criando ${numWallets} carteiras...`);
  
  // Criar as carteiras
  const newWallets = [];
  for (let i = 0; i < numWallets; i++) {
    // Criar nova carteira
    const wallet = createWallet();
    console.log(`Carteira ${i+1} criada: ${wallet.publicKey}`);
    
    // Adicionar à lista de novas carteiras
    newWallets.push({
      index: i+1,
      publicKey: wallet.publicKey,
      secretKey: wallet.secretKey,
      amount: 0, // Inicialmente 0, será atualizado se a transferência for bem-sucedida
      transferSuccess: false
    });
  }
  
  // Salvar as carteiras criadas primeiro
  const filename = 'solana_wallets.json';
  saveWallets(newWallets, filename);
  console.log(`Carteiras criadas e salvas em ${filename}`);
  
  // Tentar transferir SOL para cada carteira
  if (amountPerWallet > 0) {
    console.log(`Tentando transferir ${amountPerWallet} SOL para cada carteira...`);
    
    // Definir um timeout global para todas as transferências
    const transferTimeout = setTimeout(() => {
      console.log('\nTempo limite global para transferências excedido!');
      console.log('O processo será interrompido e as carteiras já criadas serão salvas.');
      process.exit(1); // Encerrar o processo com código de erro
    }, 60000); // 60 segundos para todas as transferências
    
    let successCount = 0;
    for (let i = 0; i < newWallets.length; i++) {
      try {
        const wallet = newWallets[i];
        console.log(`\nTransferindo ${amountPerWallet} SOL para a carteira ${i+1} (${wallet.publicKey})...`);
        
        // Tentar a transferência com timeout individual
        const signature = await transferSOL(mainWallet, wallet.publicKey, amountPerWallet);
        console.log(`Transferência concluída. Assinatura: ${signature}`);
        
        // Atualizar informações da carteira
        wallet.amount = amountPerWallet;
        wallet.transferSuccess = true;
        successCount++;
        
        // Salvar após cada transferência bem-sucedida
        saveWallets(newWallets, filename);
        console.log(`Arquivo ${filename} atualizado com a transferência bem-sucedida.`);
      } catch (error) {
        console.error(`\nErro ao transferir para a carteira ${i+1}:`);
        if (error.message) {
          console.error(`Mensagem de erro: ${error.message}`);
        }
        
        // Salvar após cada tentativa, mesmo com falha
        saveWallets(newWallets, filename);
        console.log(`Arquivo ${filename} atualizado (transferência falhou).`);
      }
    }
    
    // Limpar o timeout global
    clearTimeout(transferTimeout);
    
    // Resumo final
    console.log('\n=== Resumo das Transferências ===');
    if (successCount > 0) {
      console.log(`${successCount} de ${newWallets.length} transferências concluídas com sucesso.`);
    } else {
      console.log('Nenhuma transferência foi confirmada com sucesso pelo script.');
      console.log('\nIMPORTANTE: Mesmo com os erros exibidos, as transferências podem ter sido processadas com sucesso.');
      console.log('Verifique o saldo das carteiras em um explorador da Solana ou em sua carteira (como Phantom).');
      console.log('\nPossíveis motivos para os erros:');
      console.log('1. Saldo insuficiente na carteira principal');
      console.log('2. Problemas de conexão com a rede Solana');
      console.log('3. A carteira principal não existe na rede selecionada');
      console.log('4. Limitações de taxa da API Solana');
      console.log('5. A transação foi enviada, mas o script não conseguiu confirmar devido a problemas de conexão');
    }
  }
  
  console.log(`Todas as ${newWallets.length} carteiras foram criadas e salvas em ${filename}.`);
  
  // Perguntar se o usuário deseja verificar o saldo das carteiras
  const checkBalances = prompt('\nDeseja verificar o saldo atual das carteiras criadas? (s/n): ').toLowerCase();
  if (checkBalances === 's' || checkBalances === 'sim' || checkBalances === 'y' || checkBalances === 'yes') {
    await checkAllWallets(newWallets);
  }
  
  // Perguntar se o usuário deseja abrir o explorador Solana para verificar as carteiras
  const openExplorer = prompt('\nDeseja abrir o explorador Solana para verificar as carteiras? (s/n): ').toLowerCase();
  if (openExplorer === 's' || openExplorer === 'sim' || openExplorer === 'y' || openExplorer === 'yes') {
    for (let i = 0; i < newWallets.length; i++) {
      const wallet = newWallets[i];
      const explorerUrl = getSolanaExplorerUrl(wallet.publicKey);
      console.log(`\nAbrindo explorador para a carteira ${i+1} (${wallet.publicKey})...`);
      
      try {
        // Abrir o explorador Solana no navegador padrão
        const command = process.platform === 'win32'
          ? `start ${explorerUrl}`
          : (process.platform === 'darwin' ? `open ${explorerUrl}` : `xdg-open ${explorerUrl}`);
        
        const { exec } = require('child_process');
        exec(command);
        
        // Pequena pausa entre abrir cada URL para evitar problemas
        if (i < newWallets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`Não foi possível abrir o navegador automaticamente. Por favor, acesse manualmente: ${explorerUrl}`);
      }
    }
  }
  
  console.log('\nIMPORTANTE: Se você encontrou erros de conexão ou limitação de taxa, isso é normal ao usar endpoints públicos da Solana.');
  console.log('As carteiras foram criadas com sucesso e as transferências podem ter sido processadas mesmo com os erros.');
  console.log('Verifique o saldo das carteiras usando o explorador Solana ou sua carteira (como Phantom).');
  
  console.log('\nProcesso concluído. Obrigado por usar o Bot de Criação de Carteiras Solana!');
}

// Executar a função principal
main().catch(error => {
  console.error('Erro no programa principal:', error);
});