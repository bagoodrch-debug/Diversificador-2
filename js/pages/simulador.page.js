/**
 * Distribui Rico — pages/simulador.page.js
 * -----------------------------------------------------------------------
 * Orquestra a ferramenta: liga os inputs estáticos do index.html ao
 * store central e decide o que cada mudança de estado precisa
 * re-renderizar. Nenhuma regra de negócio mora aqui — tudo é delegado a
 * DR.alocacaoService (puro) e aos componentes (DR.graficoCanvas,
 * DR.tabelaAtivos, DR.toast). Este arquivo só faz orquestração.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { qs, qsa, criarEl, limpar } = DR.dom;
  const { formatarMoeda, formatarPercentual, parseMoeda, clamp } = DR.format;
  const {
    calcularDistribuicaoPadrao,
    rebalancearAoAjustar,
    validarSoma100,
    calcularValoresPorCategoria,
    classificarDiversificacao,
  } = DR.alocacaoService;

  const store = DR.criarStore({ patrimonio: 0, alocacoes: [] });

  // Lembra o último conjunto de categorias renderizado para decidir entre
  // rebuild completo (categorias mudaram) e sincronização in-place (só
  // valores mudaram) — essencial para não perder o foco/arraste de um
  // slider a cada re-render, e para não apagar preços já digitados nos
  // cartões de ativos.
  let ultimoConjuntoCategorias = "";

  /** Pequeno debounce genérico — evita recalcular a cada tecla digitada. */
  function debounce(fn, atrasoMs) {
    let idTimeout;
    return function debounced(...args) {
      clearTimeout(idTimeout);
      idTimeout = setTimeout(() => fn.apply(this, args), atrasoMs);
    };
  }

  // ---- Referências de DOM (buscadas uma única vez na inicialização) ----
  let refs = {};

  function coletarReferencias() {
    const patrimonioInput = qs("#patrimonio");
    refs = {
      patrimonioInput,
      patrimonioErro: qs("#patrimonio-erro"),
      currencyWrap: patrimonioInput ? patrimonioInput.closest(".currency-input") : null,
      categoriaInputs: qsa('input[name="categoria"]'),

      allocationRows: qs("#allocation-rows"),
      allocationEmpty: qs("#allocation-empty"),
      allocationTotal: qs("#allocation-total-value"),

      resumoPatrimonio: qs("#resumo-patrimonio"),
      resumoCategorias: qs("#resumo-categorias"),
      resumoDiversificacao: qs("#resumo-diversificacao"),
      resultadosTabela: qs("#resultados-tabela-corpo"),

      donutWrap: qs("#donut-wrap"),
      canvas: qs("#grafico-distribuicao"),
      donutTotal: qs("#donut-total"),
      chartLegend: qs("#chart-legend"),

      assetsGrid: qs("#assets-grid"),
      assetsEmpty: qs("#assets-empty"),
      carteiraTbody: qs("#carteira-tabela-corpo"),
    };
  }

  // ------------------------------------------------------------------
  // Leitura de entrada
  // ------------------------------------------------------------------

  function lerCategoriasSelecionadas() {
    return refs.categoriaInputs.filter((input) => input.checked).map((input) => input.value);
  }

  // ------------------------------------------------------------------
  // Validação e atualização do patrimônio
  // ------------------------------------------------------------------

  function tratarPatrimonioAlterado() {
    const texto = refs.patrimonioInput.value.trim();

    if (texto === "") {
      definirErroPatrimonio(false);
      store.setState({ patrimonio: 0 });
      return;
    }

    const valor = parseMoeda(texto);
    const valido = valor !== null && valor > 0 && isFinite(valor);

    definirErroPatrimonio(!valido);
    if (!valido) return; // mantém o último patrimônio válido no estado

    store.setState({ patrimonio: valor });
  }

  function definirErroPatrimonio(temErro) {
    refs.patrimonioErro.classList.toggle("is-hidden", !temErro);
    if (refs.currencyWrap) refs.currencyWrap.classList.toggle("has-error", temErro);
    refs.patrimonioInput.setAttribute("aria-invalid", String(temErro));
    // Inclui o id do erro em aria-describedby só quando ele está visível —
    // toggling apenas o display:none em role="alert" nem sempre é
    // anunciado de forma confiável por leitores de tela; mudar a lista de
    // describedby é a forma mais robusta de garantir o anúncio.
    refs.patrimonioInput.setAttribute("aria-describedby", temErro ? "patrimonio-hint patrimonio-erro" : "patrimonio-hint");
  }

  // ------------------------------------------------------------------
  // Categorias e recálculo de alocação
  // ------------------------------------------------------------------

  function tratarCategoriasAlteradas() {
    const ids = lerCategoriasSelecionadas();
    const alocacoes = calcularDistribuicaoPadrao(ids);
    store.setState({ alocacoes });
  }

  /** Recalcula a partir do arraste de UM slider, preservando a proporção das demais categorias. */
  function tratarSliderAlterado(idCategoria, valorBruto) {
    const { alocacoes } = store.getState();
    const novasAlocacoes = rebalancearAoAjustar(alocacoes, idCategoria, valorBruto);
    store.setState({ alocacoes: novasAlocacoes });
  }

  // ------------------------------------------------------------------
  // Renderização — cada função só toca a parte do DOM pela qual é responsável
  // ------------------------------------------------------------------

  function renderizarTudo(state) {
    // Rede de segurança: por construção rebalancearAoAjustar/
    // calcularDistribuicaoPadrao sempre somam 100, mas se algum caminho
    // novo no futuro quebrar essa invariante, o usuário é avisado em vez
    // de ver um resultado silenciosamente errado.
    if (state.alocacoes.length > 0 && !validarSoma100(state.alocacoes)) {
      DR.toast.mostrar("A soma dos percentuais não fechou em 100%. Recalculando.", "erro");
      const idsAtuais = state.alocacoes.map((a) => a.id);
      store.setState({ alocacoes: calcularDistribuicaoPadrao(idsAtuais) });
      return; // o setState acima dispara um novo ciclo de renderização
    }

    const conjuntoAtual = state.alocacoes
      .map((a) => a.id)
      .slice()
      .sort()
      .join(",");
    const categoriasMudaram = conjuntoAtual !== ultimoConjuntoCategorias;
    ultimoConjuntoCategorias = conjuntoAtual;

    const alocacoesComValor = calcularValoresPorCategoria(state.patrimonio, state.alocacoes);

    renderizarSliders(alocacoesComValor, categoriasMudaram);
    renderizarResumoResultados(state, alocacoesComValor);
    renderizarGrafico(state, alocacoesComValor);
    renderizarAtivos(alocacoesComValor, categoriasMudaram);
  }

  function renderizarSliders(alocacoesComValor, rebuild) {
    const semCategorias = alocacoesComValor.length === 0;
    refs.allocationEmpty.classList.toggle("is-hidden", !semCategorias);
    refs.allocationRows.classList.toggle("is-hidden", semCategorias);

    const totalAlocado = alocacoesComValor.reduce((soma, a) => soma + a.percentual, 0);
    refs.allocationTotal.textContent = formatarPercentual(semCategorias ? 0 : totalAlocado);

    if (semCategorias) {
      limpar(refs.allocationRows);
      return;
    }

    if (rebuild) {
      construirLinhasSlider(alocacoesComValor);
    } else {
      atualizarLinhasSlider(alocacoesComValor);
    }
  }

  function construirLinhasSlider(alocacoesComValor) {
    limpar(refs.allocationRows);

    alocacoesComValor.forEach((alocacao, indice) => {
      const categoria = DR.obterCategoriaPorId(alocacao.id);
      const nome = categoria ? categoria.nome : alocacao.id;
      const cor = DR.graficoCanvas.corDaFatia(indice);

      const ponto = criarEl("span", { class: "dot" });
      ponto.style.setProperty("--dot-color", cor);

      const slider = criarEl("input", {
        type: "range",
        min: "0",
        max: "100",
        value: String(Math.round(alocacao.percentual)),
        class: "allocation-slider",
        dataset: { categoriaId: alocacao.id },
        "aria-label": `Percentual alocado em ${nome}`,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": String(Math.round(alocacao.percentual)),
      });
      slider.style.setProperty("--fill", `${alocacao.percentual}%`);

      const linha = criarEl("div", { class: "allocation-row", dataset: { categoriaId: alocacao.id } }, [
        criarEl("div", { class: "allocation-label" }, [ponto, nome]),
        slider,
        criarEl("div", { class: "allocation-value" }, [
          criarEl("span", { class: "pct" }, [formatarPercentual(alocacao.percentual)]),
          criarEl("span", { class: "currency" }, [formatarMoeda(alocacao.valor)]),
        ]),
      ]);

      refs.allocationRows.appendChild(linha);
    });
  }

  function atualizarLinhasSlider(alocacoesComValor) {
    alocacoesComValor.forEach((alocacao) => {
      const linha = refs.allocationRows.querySelector(`.allocation-row[data-categoria-id="${alocacao.id}"]`);
      if (!linha) return;

      const slider = linha.querySelector(".allocation-slider");
      // Não sobrescreve o slider que o próprio usuário está arrastando
      // agora — evita "brigar" com o dedo/mouse dele em pleno gesto.
      if (document.activeElement !== slider) {
        slider.value = String(Math.round(alocacao.percentual));
      }
      slider.style.setProperty("--fill", `${alocacao.percentual}%`);
      slider.setAttribute("aria-valuenow", String(Math.round(alocacao.percentual)));

      linha.querySelector(".pct").textContent = formatarPercentual(alocacao.percentual);
      linha.querySelector(".currency").textContent = formatarMoeda(alocacao.valor);
    });
  }

  function renderizarResumoResultados(state, alocacoesComValor) {
    refs.resumoPatrimonio.textContent = formatarMoeda(state.patrimonio);
    refs.resumoCategorias.textContent = String(alocacoesComValor.length);

    const diversificacao = classificarDiversificacao(alocacoesComValor);
    refs.resumoDiversificacao.textContent = diversificacao.rotulo;
    refs.resumoDiversificacao.className = `summary-value badge badge-${diversificacao.nivel}`;

    limpar(refs.resultadosTabela);

    if (alocacoesComValor.length === 0) {
      refs.resultadosTabela.appendChild(
        criarEl("tr", {}, [criarEl("td", { colspan: "3" }, ["Selecione uma categoria para ver o resultado."])])
      );
      return;
    }

    alocacoesComValor.forEach((alocacao) => {
      const categoria = DR.obterCategoriaPorId(alocacao.id);
      refs.resultadosTabela.appendChild(
        criarEl("tr", {}, [
          criarEl("td", {}, [categoria ? categoria.nome : alocacao.id]),
          criarEl("td", {}, [formatarPercentual(alocacao.percentual)]),
          criarEl("td", {}, [formatarMoeda(alocacao.valor)]),
        ])
      );
    });
  }

  function renderizarGrafico(state, alocacoesComValor) {
    // Maior fatia primeiro: reforça visualmente qual categoria domina a
    // carteira e mantém a cor de destaque (dourado) sempre na maior fatia.
    const ordenadas = [...alocacoesComValor].sort((a, b) => b.percentual - a.percentual);

    DR.graficoCanvas.desenhar(refs.canvas, ordenadas);
    DR.graficoCanvas.renderizarLegenda(refs.chartLegend, ordenadas, state.patrimonio);
    refs.donutTotal.textContent = formatarMoeda(state.patrimonio);

    const tinhaConteudo = refs.donutWrap.classList.contains("is-revealed");
    if (ordenadas.length > 0 && !tinhaConteudo) {
      refs.donutWrap.classList.add("is-revealed");
    } else if (ordenadas.length === 0) {
      refs.donutWrap.classList.remove("is-revealed");
    }
  }

  function renderizarAtivos(alocacoesComValor, rebuild) {
    const semCategorias = alocacoesComValor.length === 0;
    refs.assetsEmpty.classList.toggle("is-hidden", !semCategorias);
    refs.assetsGrid.classList.toggle("is-hidden", semCategorias);

    if (semCategorias) {
      limpar(refs.assetsGrid);
      limpar(refs.carteiraTbody);
      refs.carteiraTbody.appendChild(
        criarEl("tr", {}, [
          criarEl("td", { colspan: "7" }, ["Selecione uma categoria para ver ativos sugeridos."]),
        ])
      );
      return;
    }

    if (rebuild) {
      DR.tabelaAtivos.renderizar(refs.assetsGrid, alocacoesComValor, refs.carteiraTbody);
    } else {
      DR.tabelaAtivos.sincronizar(refs.assetsGrid, alocacoesComValor, refs.carteiraTbody);
    }
  }

  // ------------------------------------------------------------------
  // Eventos
  // ------------------------------------------------------------------

  function ligarEventos() {
    const tratarPatrimonioComDebounce = debounce(tratarPatrimonioAlterado, 250);
    refs.patrimonioInput.addEventListener("input", tratarPatrimonioComDebounce);

    refs.categoriaInputs.forEach((input) => {
      input.addEventListener("change", tratarCategoriasAlteradas);
    });

    // Delegação de evento: as linhas de slider são recriadas dinamicamente,
    // então o listener fica no container fixo, não em cada slider.
    refs.allocationRows.addEventListener("input", (evento) => {
      const slider = evento.target.closest(".allocation-slider");
      if (!slider) return;
      tratarSliderAlterado(slider.dataset.categoriaId, Number(slider.value));
    });

    store.subscribe(renderizarTudo);
  }

  // ------------------------------------------------------------------
  // Inicialização
  // ------------------------------------------------------------------

  function inicializar() {
    coletarReferencias();
    if (!refs.patrimonioInput) return; // esta página não tem o simulador (defensivo)

    ligarEventos();
    DR.tabelaAtivos.inicializarBuscaGlobal();

    const patrimonioInicial = parseMoeda(refs.patrimonioInput.value) || 0;
    const alocacoesIniciais = calcularDistribuicaoPadrao(lerCategoriasSelecionadas());
    store.setState({ patrimonio: patrimonioInicial, alocacoes: alocacoesIniciais });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }
})((window.DR = window.DR || {}));
