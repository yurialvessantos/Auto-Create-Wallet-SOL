# Bot de Criação de Carteiras Solana

Este bot permite criar múltiplas carteiras na rede Solana Devnet e transferir SOL de uma carteira principal para cada uma das novas carteiras criadas.

## Funcionalidades

- Cria uma quantidade especificada de carteiras Solana
- Solicita SOL do faucet da Devnet para a carteira principal se o saldo for insuficiente
- Transfere SOL da carteira principal para cada nova carteira
- Armazena as informações das novas carteiras em um arquivo JSON
- Não armazena a chave secreta da carteira principal

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

## Instalação

1. Clone ou baixe este repositório
2. Navegue até o diretório do projeto
3. Instale as dependências:

```bash
npm install
```

## Uso

1. Execute o script:

```bash
npm start
```

2. Siga as instruções no terminal:
   - Digite a chave secreta da carteira principal (formato Base58)
   - Informe quantas carteiras deseja criar
   - Especifique quanto SOL deseja transferir para cada carteira (pode ser 0 se quiser apenas criar as carteiras sem transferir fundos)
   - Ao final, escolha se deseja verificar o saldo atual das carteiras criadas
   - Opcionalmente, abra o explorador Solana diretamente no navegador para verificar as carteiras

3. As novas carteiras serão criadas, os fundos serão transferidos e as informações serão salvas no arquivo `solana_wallets.json`.

4. Se ocorrerem erros de conexão durante as transferências, use a opção de verificação de saldo ao final ou o explorador Solana para confirmar se as transferências foram bem-sucedidas.

## Importante

- O bot usa exclusivamente a rede Solana Devnet com o endpoint QuickNode.
- Solicita automaticamente SOL do faucet da Devnet para a carteira principal se o saldo for insuficiente.
- As carteiras são criadas e salvas imediatamente, antes de tentar qualquer transferência.
- O arquivo de carteiras é atualizado após cada tentativa de transferência, seja bem-sucedida ou não.
- Implementa timeouts para evitar que o script fique presa em operações de transferência.
- Oferece a opção de verificar o saldo atual das carteiras criadas ao final do processo.
- Fornece links para o explorador Solana para verificação manual dos saldos.
- Permite abrir o explorador Solana diretamente no navegador para verificar as carteiras.
- Detecta transferências bem-sucedidas mesmo quando o script reporta erros de conexão.
- A chave secreta da carteira principal não é armazenada em nenhum arquivo.
- As chaves secretas das novas carteiras são armazenadas no arquivo `solana_wallets.json`.

## Observações sobre Erros de Conexão

Devido a limitações das APIs da Solana, o script pode mostrar erros de conexão mesmo quando as transferências foram realizadas com sucesso. Isso acontece porque:

1. A transação é enviada com sucesso para a rede Solana
2. O script tenta confirmar a conclusão da transação, mas encontra problemas de conexão
3. A transação é processada pela rede Solana, mas o script não consegue detectar isso

Se você encontrar erros de conexão, use a opção de verificação de saldo ao final para confirmar se as transferências foram bem-sucedidas. Se a verificação via API também falhar, use os links do explorador Solana fornecidos para verificar os saldos manualmente.

## Exemplo de saída

O arquivo `solana_wallets.json` terá um formato semelhante a este:

```json
[
  {
    "index": 1,
    "publicKey": "7JnHPPJBBKSTz1YPMbzFrTXcuQxYNy2xi8g9LMYXrPVd",
    "secretKey": "4KLCp9EXeFGJL641B5UtP8x4C3JxC9vxLJQEYxfSvGHQKKxnwpZ3HoUQRPQ9YG9mLJm5RnRWP4QkUZ8K2SHTiK5V",
    "amount": 0.1,
    "transferSuccess": true
  },
  {
    "index": 2,
    "publicKey": "BvzKvn5VpVhj9VqLRoJ1VJpCjaTYMpLEQ3DYzYtpgXkA",
    "secretKey": "3Hzz8QnQmN5KJhoEJL5UKzJnFDmJFXGHJqJajECvG4GnYRCpVkwZ2WJa3zWMx3L3YZP5XcG5XKM4VNnkX5VKbRVK",
    "amount": 0.01,
    "transferSuccess": true
  }
]
```

Após a verificação de saldo, o arquivo pode ser atualizado com os valores reais:

```json
[
  {
    "index": 1,
    "publicKey": "7JnHPPJBBKSTz1YPMbzFrTXcuQxYNy2xi8g9LMYXrPVd",
    "secretKey": "4KLCp9EXeFGJL641B5UtP8x4C3JxC9vxLJQEYxfSvGHQKKxnwpZ3HoUQRPQ9YG9mLJm5RnRWP4QkUZ8K2SHTiK5V",
    "amount": 0.1,
    "transferSuccess": true
  },
  {
    "index": 2,
    "publicKey": "BvzKvn5VpVhj9VqLRoJ1VJpCjaTYMpLEQ3DYzYtpgXkA",
    "secretKey": "3Hzz8QnQmN5KJhoEJL5UKzJnFDmJFXGHJqJajECvG4GnYRCpVkwZ2WJa3zWMx3L3YZP5XcG5XKM4VNnkX5VKbRVK",
    "amount": 0.01,
    "transferSuccess": true
  }
]