/**
 * Distribui Rico — components/tabela-ativos.js
 * -----------------------------------------------------------------------
 * Renderiza um cartão por categoria selecionada (ativo de exemplo + preço
 * + cálculo de quantidade) e mantém, a partir do mesmo estado, a tabela
 * "Carteira gerada" (Ativo, Ticker, Preço, Quantidade sugerida, Valor
 * destinado, Percentual, Valor restante).
 *
 * `renderizar` faz um rebuild completo (usado quando o CONJUNTO de
 * categorias muda). `sincronizar` só atualiza valores em cartões já
 * existentes (usado quando patrimônio/percentuais mudam) — importante
 * para não apagar um preço que o usuário já digitou.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { criarEl, limpar } = DR.dom;
  const { formatarMoeda, formatarPercentual, parseMoeda } = DR.format;
  const { calcularQuantidadeAtivo } = DR.alocacaoService;

  // Estado da carteira gerada, por categoria. Vive em memória do módulo —
  // não é persistido (a ferramenta é 100% client-side, sem backend).
  const estadoCarteira = {};
  let ordemCategorias = [];
  let tbodyCarteiraAtual = null;

  /** Rebuild completo: uma chamada por categoria alocada. */
  function renderizar(container, alocacoesComValor, tbodyCarteira) {
    limpar(container);
    ordemCategorias = alocacoesComValor.map((a) => a.id);
    tbodyCarteiraAtual = tbodyCarteira || tbodyCarteiraAtual;

    // Remove do estado categorias que não fazem mais parte da seleção.
    Object.keys(estadoCarteira).forEach((id) => {
      if (!ordemCategorias.includes(id)) delete estadoCarteira[id];
    });

    alocacoesComValor.forEach((alocacao) => {
      const categoria = DR.obterCategoriaPorId(alocacao.id);
      const ativos = DR.ATIVOS[alocacao.id] || [];
      if (!categoria || ativos.length === 0) return;
      container.appendChild(montarCard(categoria, ativos, alocacao));
    });

    renderizarTabelaCarteira();
  }

  /** Atualização in-place: mantém os cartões existentes, só atualiza valores. */
  function sincronizar(container, alocacoesComValor, tbodyCarteira) {
    tbodyCarteiraAtual = tbodyCarteira || tbodyCarteiraAtual;

    alocacoesComValor.forEach((alocacao) => {
      const card = container.querySelector(`.asset-card[data-categoria="${alocacao.id}"]`);
      if (!card) return;

      const linhaValor = card.querySelector(".asset-allocated");
      if (linhaValor) linhaValor.textContent = `Valor alocado: ${formatarMoeda(alocacao.valor)}`;

      const resultadoEl = card.querySelector(".asset-result");
      atualizarEstadoCarteira(alocacao.id, { valorAlocado: alocacao.valor, percentual: alocacao.percentual });
      if (resultadoEl) atualizarResultado(alocacao.id, resultadoEl);
    });

    renderizarTabelaCarteira();
  }

  function montarCard(categoria, ativos, alocacao) {
    const ativoInicial = ativos[0];
    const idSelect = `ativo-select-${categoria.id}`;
    const idPreco = `preco-${categoria.id}`;

    const select = criarEl(
      "select",
      { id: idSelect },
      ativos.map((ativo) => criarEl("option", { value: ativo.id }, [`${ativo.nome} (${ativo.tipo})`]))
    );

    const precoInput = criarEl("input", {
      type: "text",
      id: idPreco,
      inputmode: "decimal",
      placeholder: "0,00",
      "aria-describedby": `${idPreco}-hint`,
    });

    const controlesPreco = criarEl("div", { class: "asset-price-controls" }, [
      precoInput,
      temTicker(ativoInicial) ? criarBotaoBuscar() : null,
    ]);

    const resultado = criarEl("div", { class: "asset-result" });

    const card = criarEl("div", { class: "asset-card", dataset: { categoria: categoria.id } }, [
      criarEl("h3", {}, [categoria.nome]),
      criarEl("p", { class: "asset-allocated" }, [`Valor alocado: ${formatarMoeda(alocacao.valor)}`]),
      criarEl("div", { class: "field-group" }, [
        criarEl("label", { for: idSelect }, ["Ativo de exemplo (educacional)"]),
        select,
      ]),
      criarEl("div", { class: "field-group" }, [
        criarEl("label", { for: idPreco }, ["Preço de referência (R$)"]),
        controlesPreco,
        criarEl("span", { id: `${idPreco}-hint`, class: "field-hint" }, [
          "Digite um preço ou, para ativos negociados em bolsa, busque a cotação atual.",
        ]),
      ]),
      resultado,
    ]);

    // Estado inicial da carteira para esta categoria (sem preço ainda).
    estadoCarteira[categoria.id] = {
      nome: ativoInicial.nome,
      ticker: ativoInicial.ticker,
      preco: null,
      valorAlocado: alocacao.valor,
      percentual: alocacao.percentual,
      quantidade: 0,
      valorInvestido: 0,
      valorRestante: alocacao.valor,
    };

    atualizarResultado(categoria.id, resultado);
    wireEventosCard({ card, categoria, ativos, select, precoInput, controlesPreco, resultado });

    return card;
  }

  function wireEventosCard({ card, categoria, ativos, select, precoInput, controlesPreco, resultado }) {
    select.addEventListener("change", () => {
      const ativo = ativos.find((a) => a.id === select.value);
      const botaoExistente = controlesPreco.querySelector(".asset-search-btn");

      if (temTicker(ativo) && !botaoExistente) {
        controlesPreco.appendChild(criarBotaoBuscar());
      } else if (!temTicker(ativo) && botaoExistente) {
        botaoExistente.remove();
      }

      // Trocar de ativo invalida o preço anterior — evita mostrar a
      // quantidade calculada com o preço de um papel diferente.
      precoInput.value = "";
      atualizarEstadoCarteira(categoria.id, { nome: ativo.nome, ticker: ativo.ticker, preco: null });
      atualizarResultado(categoria.id, resultado);
      renderizarTabelaCarteira();
    });

    precoInput.addEventListener("input", () => {
      const preco = parseMoeda(precoInput.value);
      atualizarEstadoCarteira(categoria.id, { preco });
      atualizarResultado(categoria.id, resultado);
      renderizarTabelaCarteira();
    });

    controlesPreco.addEventListener("click", (evento) => {
      const botao = evento.target.closest(".asset-search-btn");
      if (!botao) return;
      const ativo = ativos.find((a) => a.id === select.value);
      if (!temTicker(ativo)) return;
      buscarCotacaoNoCard(ativo, categoria, precoInput, resultado, botao);
    });
  }

  function criarBotaoBuscar() {
    return criarEl("button", { type: "button", class: "btn btn-ghost btn-sm asset-search-btn" }, ["Buscar cotação"]);
  }

  function temTicker(ativo) {
    return Boolean(ativo && ativo.ticker);
  }

  async function buscarCotacaoNoCard(ativo, categoria, precoInput, resultadoEl, botao) {
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Buscando...";

    const resposta = await DR.api.buscarCotacao([ativo.ticker]);

    botao.disabled = false;
    botao.textContent = textoOriginal;

    if (!resposta.ok || !resposta.dados || resposta.dados.length === 0) {
      DR.toast.mostrar(resposta.mensagem || "Não foi possível buscar a cotação agora.", "erro");
      return;
    }

    const cotacao = resposta.dados[0];
    if (cotacao.preco === null) {
      DR.toast.mostrar(`Não recebemos um preço válido para ${ativo.ticker}.`, "erro");
      return;
    }

    precoInput.value = String(cotacao.preco).replace(".", ",");
    atualizarEstadoCarteira(categoria.id, { preco: cotacao.preco });
    atualizarResultado(categoria.id, resultadoEl);
    renderizarTabelaCarteira();
    DR.toast.mostrar(`${cotacao.ticker} atualizado: ${formatarMoeda(cotacao.preco)}`, "sucesso");
  }

  /** Mescla campos parciais no estado da carteira de uma categoria e recalcula quantidade/restante. */
  function atualizarEstadoCarteira(categoriaId, parcial) {
    const atual = estadoCarteira[categoriaId];
    if (!atual) return;

    Object.assign(atual, parcial);

    const calculo = calcularQuantidadeAtivo(atual.valorAlocado, atual.preco);
    atual.quantidade = calculo.quantidade;
    atual.valorInvestido = calculo.valido ? calculo.valorInvestido : 0;
    atual.valorRestante = calculo.valido ? calculo.valorRestante : atual.valorAlocado;
  }

  function atualizarResultado(categoriaId, resultadoEl) {
    const estado = estadoCarteira[categoriaId];
    limpar(resultadoEl);

    if (!estado || !(estado.preco > 0)) {
      resultadoEl.appendChild(criarEl("p", { class: "asset-result-hint" }, ["Informe um preço para ver a quantidade sugerida."]));
      return;
    }

    resultadoEl.appendChild(
      criarEl("p", {}, [
        criarEl("strong", {}, [`${estado.quantidade} `, estado.quantidade === 1 ? "unidade" : "unidades"]),
        ` — investido ${formatarMoeda(estado.valorInvestido)}, sobra ${formatarMoeda(estado.valorRestante)}`,
      ])
    );
  }

  /** Reconstrói a tabela "Carteira gerada" a partir do estado atual, na ordem das categorias. */
  function renderizarTabelaCarteira() {
    if (!tbodyCarteiraAtual) return;
    limpar(tbodyCarteiraAtual);

    const linhasComPreco = ordemCategorias
      .map((id) => estadoCarteira[id])
      .filter((estado) => estado && estado.preco > 0);

    if (linhasComPreco.length === 0) {
      tbodyCarteiraAtual.appendChild(
        criarEl("tr", {}, [
          criarEl("td", { colspan: "7" }, ["Informe um preço em pelo menos um ativo acima para gerar a carteira."]),
        ])
      );
      return;
    }

    linhasComPreco.forEach((estado) => {
      tbodyCarteiraAtual.appendChild(
        criarEl("tr", {}, [
          criarEl("td", {}, [estado.nome]),
          criarEl("td", {}, [estado.ticker || "—"]),
          criarEl("td", {}, [formatarMoeda(estado.preco)]),
          criarEl("td", {}, [String(estado.quantidade)]),
          criarEl("td", {}, [formatarMoeda(estado.valorAlocado)]),
          criarEl("td", {}, [formatarPercentual(estado.percentual)]),
          criarEl("td", {}, [formatarMoeda(estado.valorRestante)]),
        ])
      );
    });
  }

  /** Liga a busca global de ativos (independe de categoria) — chamada uma única vez na inicialização. */
  function inicializarBuscaGlobal() {
    const input = document.getElementById("busca-ativo-input");
    const botao = document.getElementById("busca-ativo-btn");
    const resultados = document.getElementById("busca-ativo-resultados");
    if (!input || !botao || !resultados) return;

    async function executarBusca() {
      const termo = input.value.trim();
      limpar(resultados);

      if (termo.length < 2) {
        DR.toast.mostrar("Digite ao menos 2 letras para buscar.", "info");
        return;
      }

      const textoOriginal = botao.textContent;
      botao.disabled = true;
      botao.textContent = "Buscando...";

      const resposta = await DR.api.buscarAtivos(termo);

      botao.disabled = false;
      botao.textContent = textoOriginal;

      if (!resposta.ok) {
        DR.toast.mostrar(resposta.mensagem, "erro");
        return;
      }
      if (resposta.dados.length === 0) {
        resultados.appendChild(criarEl("li", {}, ["Nenhum ativo encontrado com esse termo."]));
        return;
      }
      resposta.dados.forEach((ativo) => {
        resultados.appendChild(criarEl("li", {}, [`${ativo.ticker} — ${ativo.nome}`]));
      });
    }

    botao.addEventListener("click", executarBusca);
    input.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        executarBusca();
      }
    });
  }

  DR.tabelaAtivos = { renderizar, sincronizar, inicializarBuscaGlobal };
})((window.DR = window.DR || {}));
