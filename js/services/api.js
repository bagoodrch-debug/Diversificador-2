/**
 * Distribui Rico — services/api.js
 * =========================================================================
 * Integração com a API pública brapi.dev (cotações da B3).
 *
 * ⚠️ AVISO DE SEGURANÇA — leia antes de publicar este site:
 * A própria documentação oficial da brapi.dev é explícita: "nunca exponha
 * seu token no código do lado do cliente (frontend); em aplicações web,
 * faça as chamadas a partir do seu backend." O Distribui Rico é um site
 * 100% estático, sem backend — então a chave abaixo fica visível a
 * qualquer pessoa que abrir o DevTools ou a aba Rede do navegador, mesmo
 * depois de publicado. Isso foi implementado assim porque foi pedido
 * explicitamente, mas não é a configuração recomendada para produção.
 * Ver a explicação completa e as alternativas na conversa com o Claude.
 * =========================================================================
 */
(function (DR) {
  "use strict";

  // Constante única — nenhuma outra parte do código deve declarar sua
  // própria chave; tudo que chama a brapi.dev passa por este arquivo.
  const API_KEY = "cKTUV4VVECX6zRdJDaJNmp";

  const BASE_URL = "https://brapi.dev/api";
  const TIMEOUT_MS = 8000;
  const TENTATIVAS_EXTRAS = 2; // total de até 3 tentativas (1 original + 2 retries)
  const ESPERA_BASE_MS = 400; // backoff linear entre tentativas

  /**
   * Executa um fetch com timeout real via AbortController — sem isso, uma
   * requisição travada deixaria a interface esperando para sempre.
   */
  function fetchComTimeout(url) {
    const controlador = new AbortController();
    const idTimeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    return fetch(url, { signal: controlador.signal }).finally(() => clearTimeout(idTimeout));
  }

  /** Pausa auxiliar usada no backoff entre tentativas. */
  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Tenta buscar um recurso com retentativas automáticas em caso de falha
   * de rede ou timeout. Erros de resposta HTTP (4xx/5xx) NÃO são
   * retentados aqui — eles voltam normalmente para quem chamou decidir
   * (uma cotação inexistente não melhora tentando de novo).
   */
  async function fetchComRetry(url) {
    let ultimoErro;
    for (let tentativa = 0; tentativa <= TENTATIVAS_EXTRAS; tentativa++) {
      try {
        return await fetchComTimeout(url);
      } catch (erro) {
        ultimoErro = erro;
        if (tentativa < TENTATIVAS_EXTRAS) {
          await esperar(ESPERA_BASE_MS * (tentativa + 1));
        }
      }
    }
    throw ultimoErro;
  }

  /** Traduz status HTTP e erros técnicos em mensagens amigáveis, em português. */
  function mensagemAmigavel(status, erroOriginal) {
    if (erroOriginal && erroOriginal.name === "AbortError") {
      return "A busca demorou demais para responder. Tente novamente.";
    }
    if (erroOriginal) {
      return "Não foi possível conectar ao provedor de cotações agora. Você ainda pode informar o preço manualmente.";
    }
    switch (status) {
      case 401:
        return "Não foi possível autenticar com o provedor de cotações.";
      case 402:
        return "Limite de consultas de cotação atingido por agora. Tente novamente mais tarde.";
      case 404:
        return "Não encontramos esse ativo.";
      case 429:
        return "Muitas buscas em pouco tempo. Aguarde um instante e tente de novo.";
      default:
        return "Não foi possível buscar a cotação agora. Você ainda pode informar o preço manualmente.";
    }
  }

  /**
   * Busca a cotação atual de um ou mais tickers.
   * @param {string[]} tickers - ex.: ["PETR4", "VALE3"]
   * @returns {Promise<{ok:boolean, dados?:Array<{ticker,nome,preco,moeda}>, mensagem?:string}>}
   */
  async function buscarCotacao(tickers) {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return { ok: false, mensagem: "Nenhum ativo informado para consulta." };
    }

    const url = `${BASE_URL}/quote/${tickers.join(",")}?token=${API_KEY}`;

    try {
      const resposta = await fetchComRetry(url);
      if (!resposta.ok) {
        return { ok: false, mensagem: mensagemAmigavel(resposta.status) };
      }
      const json = await resposta.json();
      const dados = (json.results || []).map(normalizarCotacao);
      return { ok: true, dados };
    } catch (erro) {
      // Nunca deixa o erro subir cru — a interface sempre recebe algo tratável.
      console.error("[api.js] Falha ao buscar cotação:", erro);
      return { ok: false, mensagem: mensagemAmigavel(null, erro) };
    }
  }

  /**
   * Busca ativos por nome ou ticker (autocomplete de ações, FIIs, ETFs...).
   * @param {string} termo
   * @returns {Promise<{ok:boolean, dados?:Array<{ticker,nome,tipo}>, mensagem?:string}>}
   */
  async function buscarAtivos(termo) {
    if (!termo || termo.trim().length < 2) {
      return { ok: false, mensagem: "Digite ao menos 2 letras para buscar." };
    }

    const url = `${BASE_URL}/quote/list?search=${encodeURIComponent(termo.trim())}&limit=6&token=${API_KEY}`;

    try {
      const resposta = await fetchComRetry(url);
      if (!resposta.ok) {
        return { ok: false, mensagem: mensagemAmigavel(resposta.status) };
      }
      const json = await resposta.json();
      const lista = json.stocks || json.results || [];
      const dados = lista.map(normalizarResultadoBusca);
      return { ok: true, dados };
    } catch (erro) {
      console.error("[api.js] Falha ao buscar ativos:", erro);
      return { ok: false, mensagem: mensagemAmigavel(null, erro) };
    }
  }

  /** Normaliza um item de /quote/{tickers} para o formato usado na interface. */
  function normalizarCotacao(item) {
    return {
      ticker: item.symbol,
      nome: item.shortName || item.longName || item.symbol,
      preco: typeof item.regularMarketPrice === "number" ? item.regularMarketPrice : null,
      moeda: item.currency || "BRL",
    };
  }

  /** Normaliza um item de /quote/list para o formato usado na interface. */
  function normalizarResultadoBusca(item) {
    return {
      ticker: item.stock || item.symbol,
      nome: item.name || item.longName || item.stock,
      tipo: item.type || item.sector || "Ativo",
    };
  }

  DR.api = { buscarCotacao, buscarAtivos };
})((window.DR = window.DR || {}));
