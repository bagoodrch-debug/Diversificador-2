/**
 * Distribui Rico — core/format.js
 * -----------------------------------------------------------------------
 * Formatação e parsing de moeda (BRL) e percentuais. Centralizado aqui
 * para que nenhum outro módulo precise reimplementar máscara de moeda.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  /** Formata um número como moeda brasileira: 3500 -> "R$ 3.500,00". */
  function formatarMoeda(valor) {
    const numero = typeof valor === "number" && isFinite(valor) ? valor : 0;
    return formatadorMoeda.format(numero);
  }

  /**
   * Converte um texto digitado pelo usuário (ex.: "1.234,56", "1234,56"
   * ou "1234.56") em número. Devolve null quando o texto não representa
   * um número válido — quem chamar decide como tratar isso (nunca lança
   * exceção, então uma entrada inválida nunca quebra a interface).
   */
  function parseMoeda(texto) {
    if (typeof texto !== "string" || texto.trim() === "") return null;

    const limpo = texto
      .replace(/[^\d,.-]/g, "") // remove tudo que não é dígito, vírgula, ponto ou sinal
      .replace(/\.(?=\d{3}(\D|$))/g, "") // remove pontos usados como separador de milhar
      .replace(",", "."); // vírgula decimal -> ponto decimal

    const numero = parseFloat(limpo);
    return isFinite(numero) ? numero : null;
  }

  /** Formata um número como percentual inteiro: 34.6 -> "35%". */
  function formatarPercentual(valor) {
    const numero = typeof valor === "number" && isFinite(valor) ? valor : 0;
    return `${Math.round(numero)}%`;
  }

  /** Restringe um número a um intervalo fechado [minimo, maximo]. */
  function clamp(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
  }

  DR.format = { formatarMoeda, parseMoeda, formatarPercentual, clamp };
})((window.DR = window.DR || {}));
