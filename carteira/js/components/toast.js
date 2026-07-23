/**
 * Distribui Rico — components/toast.js
 * -----------------------------------------------------------------------
 * Notificações temporárias. Uso: DR.toast.mostrar("mensagem", "sucesso").
 * Tipos aceitos: "sucesso" | "erro" | "info".
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  const { criarEl } = DR.dom;
  const DURACAO_MS = 4500;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Caminhos de ícone fixos (sem interpolação de dados do usuário — seguro
  // usar innerHTML aqui, diferente do resto do app que evita innerHTML).
  const ICONES = {
    sucesso: '<path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle>',
    erro: '<line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12" y2="16.01"></line><circle cx="12" cy="12" r="9"></circle>',
    info: '<line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12" y2="8.01"></line><circle cx="12" cy="12" r="9"></circle>',
  };

  function obterContainer() {
    return document.getElementById("toast-container");
  }

  function criarIcone(tipo) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICONES[tipo];
    return svg;
  }

  /**
   * Exibe uma notificação temporária no canto da tela.
   * @param {string} mensagem
   * @param {"sucesso"|"erro"|"info"} tipo
   */
  function mostrar(mensagem, tipo) {
    const alvo = obterContainer();
    if (!alvo || !mensagem) return; // sem container ou sem mensagem: não quebra, só não mostra nada

    const tipoValido = ICONES[tipo] ? tipo : "info";

    const toast = criarEl("div", {
      class: `toast toast-${tipoValido}`,
      role: tipoValido === "erro" ? "alert" : "status",
    });

    toast.appendChild(criarIcone(tipoValido));
    toast.appendChild(criarEl("p", {}, [mensagem]));
    toast.appendChild(
      criarEl(
        "button",
        {
          type: "button",
          class: "toast-close",
          "aria-label": "Fechar notificação",
          onClick: () => remover(toast),
        },
        ["×"]
      )
    );

    alvo.appendChild(toast);
    setTimeout(() => remover(toast), DURACAO_MS);
  }

  function remover(toast) {
    if (!toast || !toast.isConnected) return;
    toast.classList.add("toast-saindo");
    setTimeout(() => toast.remove(), 200);
  }

  DR.toast = { mostrar };
})((window.DR = window.DR || {}));
