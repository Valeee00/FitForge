# FitForge

Aplicativo de treino de academia desenvolvido em **React**, utilizando **Module Federation** com Webpack 5, para a Atividade Formativa 13 de Arquitetura de Soluções Computacionais.

## Endereço publicado

**Site:** [Abrir FitForge](https://orange-glacier-0887de110.2.azurestaticapps.net/)

Hospedado no Azure Static Web Apps.

## Repositórios do projeto

| Camada | Repositório | Atividade |
|---|---|---|
| Frontend (este) | [Valeee00/FitForge](https://github.com/Valeee00/FitForge) | 13 — Microfrontend |
| Microsserviços | [Valeee00/FitForge-Microservicos](https://github.com/Valeee00/FitForge-Microservicos) | 14 — Microsserviços |
| API Gateway + BFF | [Valeee00/FitForge-API_Gateway](https://github.com/Valeee00/FitForge-API_Gateway) | 16 — API Gateway e BFF |

## Funcionalidades

- **Meus treinos:** criar, consultar, editar e excluir fichas com exercícios, séries, repetições e cargas.
- **Meu progresso:** registrar, consultar, editar e excluir sessões de treino, acompanhar indicadores e exportar o histórico em CSV.

## Arquitetura

O projeto possui três aplicações: um **shell**, responsável pela navegação e integração, e dois **microfrontends**, responsáveis por treinos e progresso. Os módulos são carregados em tempo de execução por Module Federation.

### Integração com o backend (Atividades 14 e 16)

Quando o build recebe a variável `FITFORGE_API_URL` com o endereço do **FitForge-Gateway**, as fichas e sessões passam a ser salvas nos microsserviços:

```
Navegador ──> API Gateway + BFF ──> treinos-service   (/api/treinos)
                                └─> progresso-service (/api/sessoes)
```

- O `localStorage` vira cache: a tela abre na hora, sincroniza com o servidor em segundo plano e continua funcionando se a API cair. O que foi feito offline é reenviado quando ela volta.
- O menu lateral mostra **Sincronizado com a nuvem** ou **Offline**.
- Sem `FITFORGE_API_URL`, o app funciona como na Atividade 13, só com `localStorage`.

No GitHub, cadastre a URL em **Settings → Secrets and variables → Actions → aba Variables → New repository variable**: nome `FITFORGE_API_URL`, valor `https://<seu-gateway>.azurewebsites.net`. O workflow usa essa variável no build.

Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Executar localmente

Requisito: Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Acesse http://localhost:5000. Para gerar os arquivos de publicação, execute `npm run build`.

Para usar o gateway local (porta 8080):

```bash
FITFORGE_API_URL=http://localhost:8080 npm run dev
```

Testes: `npm run check` (unitários + build + integração da federação).

## Integrantes

- Andryus Zolet
- Nicolas Medeiros
- Valentin Rojas
- Leonardo Henrique

Os integrantes também estão registrados no arquivo `GRUPO.md`.
