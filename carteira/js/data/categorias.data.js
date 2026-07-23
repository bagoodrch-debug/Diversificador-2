/**
 * Distribui Rico — data/categorias.data.js
 * -----------------------------------------------------------------------
 * Fonte única de verdade sobre as categorias de investimento: nome
 * exibido, peso padrão de distribuição (percentualPadrao) e a variável de
 * cor usada no CSS. Os IDs abaixo têm que bater com o atributo `value`
 * dos checkboxes em index.html.
 *
 * percentualPadrao é um PESO relativo, não um percentual fixo: o serviço
 * de alocação normaliza esses pesos para somar 100 entre as categorias
 * que estiverem selecionadas a cada momento (ver services/alocacao-service.js).
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  DR.CATEGORIAS = [
    { id: "acoes", nome: "Ações", percentualPadrao: 30, corVar: "--chart-1" },
    { id: "fiis", nome: "Fundos Imobiliários (FIIs)", percentualPadrao: 20, corVar: "--chart-2" },
    { id: "bdrs", nome: "BDRs", percentualPadrao: 15, corVar: "--chart-3" },
    { id: "renda-fixa", nome: "Renda Fixa", percentualPadrao: 25, corVar: "--chart-4" },
    { id: "ouro", nome: "Ouro", percentualPadrao: 10, corVar: "--chart-5" },
  ];

  /** Busca uma categoria pelo id. Devolve null se não existir (nunca lança erro). */
  DR.obterCategoriaPorId = function obterCategoriaPorId(id) {
    return DR.CATEGORIAS.find((categoria) => categoria.id === id) || null;
  };
})((window.DR = window.DR || {}));
