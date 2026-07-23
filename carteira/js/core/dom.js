/**
 * Distribui Rico — core/dom.js
 * -----------------------------------------------------------------------
 * Pequenos utilitários de DOM para evitar repetição em todos os módulos.
 * Nenhuma dependência externa. Carregado antes de qualquer módulo que
 * precise ler ou criar elementos na página.
 *
 * Padrão de arquitetura usado em TODO o projeto (ver documento de
 * arquitetura, seção 11): sem import/export, cada arquivo se registra em
 * window.DR dentro de uma IIFE — assim o site funciona tanto abrindo o
 * index.html direto no navegador quanto publicado em hospedagem comum.
 * -----------------------------------------------------------------------
 */
(function (DR) {
  "use strict";

  /** Busca um único elemento no DOM (atalho para querySelector). */
  function qs(seletor, escopo) {
    return (escopo || document).querySelector(seletor);
  }

  /** Busca vários elementos e devolve um array de verdade (não uma NodeList). */
  function qsa(seletor, escopo) {
    return Array.from((escopo || document).querySelectorAll(seletor));
  }

  /**
   * Cria um elemento sem usar innerHTML (evita XSS e mantém o DOM previsível).
   * @param {string} tag
   * @param {Object} atributos - pares atributo/valor; "class" e "dataset" são
   *   tratados especialmente; chaves começando com "on" viram addEventListener.
   * @param {Array<Node|string|null>} filhos
   */
  function criarEl(tag, atributos, filhos) {
    const el = document.createElement(tag);

    Object.entries(atributos || {}).forEach(([chave, valor]) => {
      if (valor === undefined || valor === null) return;
      if (chave === "class") {
        el.className = valor;
      } else if (chave === "dataset") {
        Object.entries(valor).forEach(([k, v]) => (el.dataset[k] = v));
      } else if (chave.startsWith("on") && typeof valor === "function") {
        el.addEventListener(chave.slice(2).toLowerCase(), valor);
      } else {
        el.setAttribute(chave, valor);
      }
    });

    (filhos || []).forEach((filho) => {
      if (filho === null || filho === undefined) return;
      el.appendChild(typeof filho === "string" ? document.createTextNode(filho) : filho);
    });

    return el;
  }

  /** Remove todos os filhos de um elemento (evita o custo/risco de innerHTML = ""). */
  function limpar(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  DR.dom = { qs, qsa, criarEl, limpar };
})((window.DR = window.DR || {}));
