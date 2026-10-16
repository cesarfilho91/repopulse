# RepoPulse

Dashboard para explorar repositórios públicos do GitHub e acompanhar métricas e commits recentes em uma interface única. O projeto consulta a GitHub REST API por meio de uma API própria em PHP, com atualização periódica no navegador e cache no servidor para reduzir chamadas externas.

## Recursos

- Busca de repositórios por tecnologia, nome ou organização.
- Indicadores de repositórios encontrados, estrelas, forks e linguagens.
- Detalhes do repositório e lista dos oito commits mais recentes.
- Atualização automática configurável a cada 60 segundos.
- Cache no backend, timeout de rede e mensagens para erros e limites da API.
- Interface responsiva, estados de carregamento e tratamento de resultados vazios.
- Testes automatizados no backend e verificações de qualidade no GitHub Actions.

## Stack

- **Backend:** PHP 8.3, Slim 4, Guzzle e PHPUnit.
- **Frontend:** React 18, TypeScript, Vite e Lucide.
- **Integração externa:** GitHub REST API.
- **Deploy:** Docker e Render Blueprint.

## Arquitetura

```text
repopulse/
├── .github/workflows/quality.yml
├── backend/
│   ├── public/index.php          # Rotas HTTP, CORS e composição da aplicação
│   ├── src/Services/             # Integração, cache e normalização do GitHub
│   ├── tests/                    # Testes unitários do serviço
│   ├── composer.json
│   └── Dockerfile
├── frontend/
│   ├── src/components/           # Cards e painel de detalhes
│   ├── src/services/             # Cliente HTTP
│   ├── src/types/                # Contratos TypeScript
│   └── src/App.tsx               # Composição da tela
└── render.yaml
```

O frontend conhece apenas os contratos da API do projeto. Credenciais opcionais e regras de cache permanecem no backend; nenhum token do GitHub é enviado ao navegador.

## Requisitos

- PHP 8.3 ou superior e Composer 2.
- Node.js 22 ou superior e npm.
- Git.

## Execução local

Abra dois terminais a partir da raiz do repositório.

### 1. Backend

```bash
cd backend
cp .env.example .env
composer install
```

Configure `CORS_ORIGINS` no ambiente do processo para `http://localhost:5173`. A variável `GITHUB_TOKEN` é opcional para desenvolvimento, mas recomendada para reduzir a chance de atingir o limite de chamadas da API pública. Use um token com acesso somente de leitura a dados públicos e nunca o versione.

Inicie a API:

```bash
CORS_ORIGINS=http://localhost:5173 php -S 0.0.0.0:8080 -t public
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Por padrão, o frontend usa `http://localhost:8080`; para outra URL, defina `VITE_API_URL` antes do build.

## API

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Estado da API |
| `GET` | `/api/search?q=react` | Pesquisa até 12 repositórios |
| `GET` | `/api/repositories/{owner}/{repo}` | Métricas e commits recentes |

As respostas de sucesso usam o formato `{ "data": ... }`. Erros são retornados com status HTTP apropriado e uma mensagem legível. A integração respeita os limites definidos pelo GitHub; chamadas não autenticadas têm limite primário de 60 requisições por hora por IP. O cache padrão é de 60 segundos e pode ser ajustado com `CACHE_TTL`.

## Testes e qualidade

Backend:

```bash
cd backend
composer lint
composer test
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

O workflow `Quality checks` executa lint sintático PHP, PHPUnit, verificação de tipos TypeScript e build do frontend em pushes e pull requests para `main`.

## Deploy no Render

O arquivo `render.yaml` descreve a API em Docker e o frontend como site estático. Para usar o Blueprint:

1. Crie um repositório público no GitHub e envie este projeto.
2. No Render, selecione **New → Blueprint** e conecte o repositório.
3. Informe `GITHUB_TOKEN` quando o Render solicitar a variável secreta. Use um token com permissões mínimas; para dados públicos, não é necessário conceder acesso a repositórios privados.
4. Após a criação dos serviços, copie a URL pública do frontend e atualize `CORS_ORIGINS` no serviço `repopulse-api` com essa origem exata, por exemplo `https://repopulse-web.onrender.com`.
5. Faça novo deploy da API e confirme `/api/health`. Depois teste uma busca no frontend.

O Blueprint liga `VITE_API_URL` ao host da API. Se preferir criar os serviços manualmente, configure `VITE_API_URL` com a URL pública da API (sem barra final) antes do build estático. Serviços gratuitos podem entrar em suspensão por inatividade, portanto a primeira consulta após um período parado pode demorar.

## Segurança e operação

- Não coloque tokens no frontend nem em arquivos versionados.
- Mantenha `APP_DEBUG` desativado em ambientes públicos caso o backend seja expandido.
- O cache em disco é local ao contêiner e pode ser descartado em reinicializações, o que é aceitável para esta demonstração. Para múltiplas instâncias, substitua-o por Redis ou outro cache compartilhado.
- A atualização no navegador é polling periódico, não um WebSocket. O indicador LIVE descreve a atualização automática, não um stream instantâneo de eventos.

## Licença

Distribuído sob a licença MIT. Consulte `LICENSE`.
