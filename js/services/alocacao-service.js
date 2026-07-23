/**
 * Distribui Rico — services/alocacao-service.js
 * -----------------------------------------------------------------------
 * Regras de negócio do simulador. Toda função aqui é PURA: recebe dados,
 * devolve dados novos, nunca toca no DOM e nunca lança exceção para uma
 * entrada "estranha" (sempre devolve algo seguro). Isso torna a lógica
 * fácil de testar isoladamente e reaproveitável em futuras ferramentas.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { clamp } = DR.format;

  /**
   * A partir dos ids de categorias selecionadas, calcula uma distribuição
   * inicial proporcional ao peso padrão de cada uma (percentualPadrao),
   * normalizada para somar exatamente 100.
   */
  function calcularDistribuicaoPadrao(idsSelecionados) {
    const categorias = idsSelecionados.map((id) => DR.obterCategoriaPorId(id)).filter(Boolean);
    if (categorias.length === 0) return [];

    const somaPesos = categorias.reduce((soma, c) => soma + c.percentualPadrao, 0);

    if (somaPesos <= 0) {
      // Fallback defensivo: sem pesos válidos, distribui em partes iguais.
      const parteIgual = 100 / categorias.length;
      return arredondarParaSoma100(categorias.map((c) => ({ id: c.id, percentual: parteIgual })));
    }

    const alocacoes = categorias.map((c) => ({
      id: c.id,
      percentual: (c.percentualPadrao / somaPesos) * 100,
    }));

    return arredondarParaSoma100(alocacoes);
  }

  /**
   * Recalcula os percentuais depois que o usuário arrasta o slider de UMA
   * categoria (idAlterado) para um novo valor. As demais categorias
   * absorvem a diferença proporcionalmente ao que já tinham — preserva a
   * relação entre elas em vez de zerar tudo. Sempre devolve uma
   * distribuição cuja soma é exatamente 100 (regra inegociável do produto).
   */
  function rebalancearAoAjustar(alocacoes, idAlterado, valorBruto) {
    const novoValor = clamp(Math.round(valorBruto), 0, 100);
    const alterada = alocacoes.find((a) => a.id === idAlterado);
    const outras = alocacoes.filter((a) => a.id !== idAlterado);

    if (!alterada) return alocacoes; // categoria desconhecida: não faz nada

    if (outras.length === 0) {
      // Única categoria selecionada: por definição, ela é 100%.
      return [{ id: alterada.id, percentual: 100 }];
    }

    const somaOutrasAlvo = 100 - novoValor;
    const somaOutrasAtual = outras.reduce((soma, a) => soma + a.percentual, 0);

    const outrasRecalculadas =
      somaOutrasAtual > 0
        ? outras.map((a) => ({
            id: a.id,
            percentual: (a.percentual / somaOutrasAtual) * somaOutrasAlvo,
          }))
        : // Se as outras estavam todas em 0 (não deveria acontecer, mas é
          // defensivo), distribui o que sobrou em partes iguais entre elas.
          outras.map((a) => ({ id: a.id, percentual: somaOutrasAlvo / outras.length }));

    const resultado = [{ id: alterada.id, percentual: novoValor }, ...outrasRecalculadas];
    return arredondarParaSoma100(resultado);
  }

  /**
   * Arredonda todos os percentuais para inteiros e corrige o desvio de
   * arredondamento aplicando a diferença na MAIOR alocação — garante que
   * a soma final seja sempre exatamente 100, nunca 99 ou 101.
   */
  function arredondarParaSoma100(alocacoes) {
    if (alocacoes.length === 0) return [];

    const arredondadas = alocacoes.map((a) => ({ id: a.id, percentual: Math.round(a.percentual) }));
    const soma = arredondadas.reduce((s, a) => s + a.percentual, 0);
    const diferenca = 100 - soma;

    if (diferenca !== 0) {
      const maior = arredondadas.reduce((max, a) => (a.percentual > max.percentual ? a : max), arredondadas[0]);
      maior.percentual += diferenca;
    }

    return arredondadas;
  }

  /** Checagem defensiva: confirma que a soma dos percentuais é exatamente 100. */
  function validarSoma100(alocacoes) {
    return alocacoes.reduce((soma, a) => soma + a.percentual, 0) === 100;
  }

  /** Converte percentuais em valores em reais, a partir do patrimônio total. */
  function calcularValoresPorCategoria(patrimonioTotal, alocacoes) {
    return alocacoes.map((a) => ({
      id: a.id,
      percentual: a.percentual,
      valor: arredondarCentavos(patrimonioTotal * (a.percentual / 100)),
    }));
  }

  /**
   * Calcula quantas unidades de um ativo cabem em um valor alocado, e
   * quanto do valor fica sem investir por causa do arredondamento (o
   * "troco" que sobra ao comprar apenas unidades inteiras).
   */
  function calcularQuantidadeAtivo(valorAlocado, precoUnitario) {
    const valorValido = typeof valorAlocado === "number" && valorAlocado >= 0;
    const precoValido = typeof precoUnitario === "number" && precoUnitario > 0;

    if (!valorValido || !precoValido) {
      return { valido: false, quantidade: 0, valorInvestido: 0, valorRestante: valorValido ? valorAlocado : 0 };
    }

    const quantidade = Math.floor(valorAlocado / precoUnitario);
    const valorInvestido = arredondarCentavos(quantidade * precoUnitario);
    const valorRestante = arredondarCentavos(valorAlocado - valorInvestido);

    return { valido: true, quantidade, valorInvestido, valorRestante };
  }

  /**
   * Classifica o nível de diversificação com base no número de categorias
   * e na concentração da maior fatia. É uma régua simples e educacional
   * — não é uma análise de risco real, e o disclaimer deixa isso claro.
   */
  function classificarDiversificacao(alocacoes) {
    if (alocacoes.length === 0) return { rotulo: "—", nivel: "neutro" };

    const maiorFatia = Math.max(...alocacoes.map((a) => a.percentual));

    if (alocacoes.length >= 4 && maiorFatia <= 40) return { rotulo: "Boa", nivel: "boa" };
    if (alocacoes.length >= 2 && maiorFatia <= 65) return { rotulo: "Moderada", nivel: "moderada" };
    return { rotulo: "Concentrada", nivel: "concentrada" };
  }

  function arredondarCentavos(valor) {
    return Math.round(valor * 100) / 100;
  }

  DR.alocacaoService = {
    calcularDistribuicaoPadrao,
    rebalancearAoAjustar,
    validarSoma100,
    calcularValoresPorCategoria,
    calcularQuantidadeAtivo,
    classificarDiversificacao,
  };
})((window.DR = window.DR || {}));
