# Cargas - CocaCola

Criar o projeto "Cargas - CocaCola" dedicado exclusivamente à gestão e controle operacional de cargas (baseado em todas as funcionalidades da aba Cargas do LaediHome), dividido em 2 perfis/telas de trabalho:

1. Perfil Faturamento:
- Visualiza o painel operacional de cargas dividido nos grupos/status: Pendente, Faturado, Impressa ag. CT-e, Corte (impedimento/erro) e Finalizada.
- NÃO tem permissão nem botões de importar cargas (o faturamento apenas processa as cargas que a Remessa já importou).
- Ações em cada carga:
  * Faturar carga (emite nota e avança status)
  * Solicitar CT-e manual (modal com contatos, e-mail pronto formatado para Outlook/cópia com DT, placa e lembrete do Triangulus, e acionamento do cronômetro de espera)
  * Registrar recebimento de CT-e e impressão de nota
  * Registrar Corte / Impedimento ("Aguardando valor no sistema", "Carga com erro")
  * Confirmar saída e Finalizar carga
- Espelho da Carga detalhado ao clicar: visualização completa dos dados da carga (data prevista, DT do motorista, placa no padrão ex: GHE1B55 ED - 9939 | Transportadora, centro de origem/destino, pallets, notas), lista completa de produtos (código, descrição, quantidade de caixas), e histórico/linha do tempo de eventos.
- Indicador visual de tempo de espera com alerta quando a carga fica parada por mais de 30 minutos.
- Exportação de relatórios em CSV (cargas do dia e liquidação).
- Histórico por placa e busca rápida.

2. Perfil Remessa:
- Responsável exclusivo pela importação de novas cargas, que entram imediatamente com status "Pendente" para o Faturamento.
- Modal de importação por colagem de texto/tabela (parser de e-mail e planilhas com colunas de Data, Carga, Origem, Destino, Transportadora, Placa, DT, Pallets, Código, Descrição, Caixas), com detecção de divergências/avisos, revisão antes de gravar e prevenção de duplicidade.
- Modal de importação rápida de carga MB (com seleção de produtos padrão Crystal 500ml, 1.5L, copo, 5L, cálculo automático de caixas por pallet, número de DT e placa).
- Acompanhamento em tempo real do status de cada carga conforme o Faturamento avança (Pendente, Faturado, Impressa ag. CT-e, Corte, Finalizada).
- Acesso completo ao Histórico dos dias (seletor de datas dos últimos 30 dias) para análise de desempenho, volume de cargas e auditoria.

Backend e Persistência:
- Banco de dados completo com Lovable Cloud para tabelas de cargas (cargo_loads), produtos da carga (cargo_products), histórico de alterações (cargo_history) e contatos de CT-e (cte_contacts).
- Interface moderna, responsiva, ágil para operação logística diária com identidade visual profissional inspirada em logística e Coca-Cola.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://faturamentocc.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0e93f236-4581-488c-9fc0-2dcacb2af094).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
