# Cargas - CocaCola

Sistema interno de controle de cargas, dividido em dois perfis de trabalho:

- **Faturamento** — processa as cargas que a Remessa importou. Emite CT-e, registra
  corte/impedimento, confirma saída e finaliza. Não importa carga.
- **Remessa** — importa as cargas e acompanha o status pelo resto do dia.

Inclui espelho da carga ao clicar, histórico por placa, agenda do dia por XLSX,
filtros para esconder finalizadas e futuras, e liquidação com confirmação.

Roda em [faturamentocc.lovable.app](https://faturamentocc.lovable.app).

## Stack

TanStack Start/Router, React 19, Tailwind 4, shadcn + Radix, Supabase (Postgres),
Drizzle, Vitest.
