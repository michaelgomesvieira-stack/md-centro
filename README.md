# Dashboard de Medidores

Painel de gestão de medidores novos e retirados de campo — PDT · BDC · PDS.
Site estático (HTML + CSS + JS puro) + uma função serverless da Vercel que guarda os dados compartilhados.

## Estrutura

```
.
├── public/               # site estático (publicado na raiz)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── data.js       # dados iniciais embutidos (DN = novos, DR = retirados)
│       └── app.js        # filtros, gráficos, tabela, importação .xlsx, salvar
├── api/
│   └── data.js           # função serverless: GET/POST /api/data
├── vercel.json
├── package.json          # dependência: @upstash/redis
└── README.md
```

## Como funciona

| Ação | O que acontece |
|---|---|
| Abrir o painel | Carrega `public/js/data.js` e, em seguida, busca no servidor os dados mais recentes salvos (atualiza a cada 60 s). |
| **Importar planilha (.xlsx)** | Pede a senha (validada no servidor), lê a planilha e mostra no painel. Ainda não grava. |
| **💾 Salvar** | Envia os dados ao servidor. **Todos** passam a ver. |
| **⬇️ Exportar data.js** | Baixa um `data.js` com os dados atuais, como backup ou para versionar no Git. |

Prioridade dos dados: **servidor > salvo no navegador > `data.js`**.
Sem backend (GitHub Pages, `python -m http.server`), o Salvar volta a gravar só no navegador e não pede senha.

## Publicar

### 1. GitHub
```bash
git init && git add . && git commit -m "Dashboard de Medidores"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/dashboard-medidores.git
git push -u origin main
```
Use repositório **privado** (há nomes de responsáveis em `public/js/data.js`).

### 2. Vercel
1. https://vercel.com/new → importe o repositório → **Deploy** (as configurações vêm do `vercel.json`).

### 3. Banco de dados (necessário para o Salvar compartilhado)
1. No projeto da Vercel: **Storage → Create Database → Upstash Redis** (plano gratuito) → conecte ao projeto.
   Isso cria sozinho as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
2. Em **Settings → Environment Variables**, crie **`ADMIN_PASSWORD`** com a senha de importar/salvar (marque Production, Preview e Development).
3. Faça **Redeploy** (Deployments → ⋯ → Redeploy) para as variáveis valerem.

### 4. Proteger o acesso (recomendado)
**Settings → Deployment Protection → Vercel Authentication**, para só pessoas autorizadas abrirem o painel.

## Segurança

- A senha **não está mais no código**: fica na variável `ADMIN_PASSWORD` e é conferida no servidor.
- O servidor bloqueia o IP por 15 min após 10 senhas erradas.
- Quem tem a senha pode sobrescrever os dados de todos. Guarde um backup com **⬇️ Exportar data.js** de tempos em tempos.
- Leitura (`GET /api/data`) não exige senha: use a Deployment Protection se os dados forem sensíveis.

## Rodar localmente

- Só o site: `npx serve public`  (Salvar fica local, sem backend)
- Site + API: `npm i -g vercel && vercel dev` (precisa de `vercel link` e `vercel env pull`)
