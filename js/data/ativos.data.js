/**
 * Distribui Rico — data/ativos.data.js
 * -----------------------------------------------------------------------
 * Ativos de exemplo por categoria — puramente educacionais, não é uma
 * recomendação de investimento (ver disclaimer no index.html).
 *
 * Quando `ticker` não é null, o ativo é negociado na B3 e a calculadora
 * mostra um botão "Buscar cotação" que consulta a brapi.dev (services/api.js).
 * Quando `ticker` é null (Tesouro Direto, CDB, ouro físico...), não há
 * cotação em bolsa a consultar — o preço é sempre informado manualmente.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  DR.ATIVOS = {
    acoes: [
      { id: "petr4", nome: "Petrobras PN", tipo: "Ação", ticker: "PETR4" },
      { id: "vale3", nome: "Vale ON", tipo: "Ação", ticker: "VALE3" },
      { id: "itub4", nome: "Itaú Unibanco PN", tipo: "Ação", ticker: "ITUB4" },
    ],
    fiis: [
      { id: "hglg11", nome: "CSHG Logística", tipo: "FII de tijolo", ticker: "HGLG11" },
      { id: "mxrf11", nome: "Maxi Renda", tipo: "FII de papel", ticker: "MXRF11" },
    ],
    bdrs: [
      { id: "aapl34", nome: "Apple", tipo: "BDR", ticker: "AAPL34" },
      { id: "msft34", nome: "Microsoft", tipo: "BDR", ticker: "MSFT34" },
      { id: "googl34", nome: "Alphabet (Google)", tipo: "BDR", ticker: "GOOGL34" },
    ],
    "renda-fixa": [
      { id: "tesouro-selic", nome: "Tesouro Selic", tipo: "Título público", ticker: null },
      { id: "cdb-cdi", nome: "CDB 100% do CDI", tipo: "Renda fixa privada", ticker: null },
      { id: "tesouro-ipca", nome: "Tesouro IPCA+", tipo: "Título público", ticker: null },
    ],
    ouro: [
      { id: "gold11", nome: "ETF de Ouro (GOLD11)", tipo: "ETF", ticker: "GOLD11" },
      { id: "ouro-fisico", nome: "Ouro físico", tipo: "Commodity", ticker: null },
    ],
  };
})((window.DR = window.DR || {}));
