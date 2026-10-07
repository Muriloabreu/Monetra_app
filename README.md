# Monetra

Aplicação de controle financeiro pessoal com React, TypeScript e Vite.

## Estado atual

- Dashboard de saldo, receitas, despesas, cartões e investimentos.
- Cadastro de lançamentos e investimentos.
- Interface responsiva para desktop e celular.
- Autenticação por e-mail e senha usando Supabase Auth, com cadastro, login, validação de sessão e logout.
- As telas financeiras exigem login. Os dados do frontend permanecem **localmente** no navegador (`localStorage`), com chaves separadas por `user.id`.
- Estrutura PostgreSQL criada e versionada em `supabase/migrations/` para a evolução da aplicação.
- As operações financeiras ainda não estão sincronizadas com as tabelas do Supabase.

## Executar localmente

```bash
npm ci
npm run dev
```

## Compilar

```bash
npm run build
```

## Banco de dados

O arquivo SQL em `supabase/migrations/` inclui as tabelas para contas, categorias, lançamentos, transferências, cartões, faturas, investimentos, metas, orçamento, recorrências e importações.

Cada tabela pública usa Row Level Security (RLS) para separar os dados por usuário do Supabase Auth. As operações entre contas, pagamentos, parcelas e investimentos precisarão usar as regras de negócio e transações apropriadas na integração futura.

## Autenticação

O app usa o projeto Supabase `ktreoegrykqxxqaqfcgk` e apenas a chave **publishable** no navegador. Para apontar para outro projeto, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local` ou nas variáveis de ambiente do serviço de hospedagem. Nunca utilize uma chave secreta ou `service_role` no frontend.

- Cadastre um e-mail e senha com pelo menos 8 caracteres.
- Se a confirmação de e-mail estiver ativada no Supabase Auth, abra o link recebido antes de entrar.
- Em **Supabase → Authentication → URL Configuration**, configure a URL do site e as URLs de redirecionamento permitidas (ambiente local e o domínio publicado), para que os links de confirmação funcionem corretamente.
- Use **Sair** na barra lateral ou em Configurações para encerrar a sessão neste dispositivo.

**Importante:** os valores cadastrados na interface atual só existem no navegador e serão perdidos se o armazenamento local for apagado. As antigas chaves de demonstração `finora-*` e `monetra-*` não são importadas automaticamente para uma conta autenticada, a fim de evitar associação indevida a outro usuário. A sincronização segura com PostgreSQL será implementada na próxima fase.
