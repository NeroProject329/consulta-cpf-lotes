# Consulta CPF

Monorepo Next.js para importar listas CSV/XLSX, consultar CPFs em modalidade gratuita ou paga, reutilizar resultados já armazenados no PostgreSQL e exportar o retorno em CSV/XLSX.

## Estrutura

- `apps/web`: aplicação Next.js (painel e API)
- `packages/database/migrations`: esquema PostgreSQL

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha os segredos.
2. Instale as dependências com `pnpm install`.
3. Execute `pnpm dev`.

O esquema do banco é criado de forma idempotente na primeira conexão da aplicação. Também pode ser aplicado manualmente a partir de `packages/database/migrations/001_initial.sql`.

## Railway

O repositório inclui `railway.json` para instalação, build, inicialização e healthcheck. Configure no serviço as variáveis listadas em `.env.example`; não é necessário adicionar Redis para o fluxo atual.

## Segurança

- O token da API e a URL do PostgreSQL são usados apenas no servidor.
- O painel exige senha e usa cookie de sessão assinado, `HttpOnly` e `SameSite=Lax`.
- CPFs são mascarados na listagem geral; dados completos ficam restritos à tela autenticada do lote.
- Resultados em cache evitam cobranças repetidas.

Antes de publicar, rotacione qualquer credencial que tenha sido compartilhada fora do gerenciador de segredos e cadastre os valores como Secrets na Vercel.
