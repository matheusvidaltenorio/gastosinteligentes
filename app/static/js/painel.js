(function () {
  "use strict";

  const STORAGE_TOKEN = "cgi_jwt";
  const STORAGE_USER_ID = "cgi_user_id";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const CATEGORIAS_DESPESA = [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Educação",
    "Lazer",
    "Compras",
    "Assinaturas e serviços",
    "Impostos e taxas",
    "Pets",
    "Presentes e doações",
    "Outros (despesa)",
  ];
  const CATEGORIAS_RECEITA = [
    "Salário",
    "Freelance / autônomo",
    "Investimentos e dividendos",
    "Vendas",
    "Aluguel recebido",
    "Reembolsos",
    "Bônus e gratificações",
    "Outros (receita)",
  ];

  function categoriasPorTipo(tipo) {
    return tipo === "RECEITA" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  }

  const TODAS_CATEGORIAS = Array.from(
    new Set([].concat(CATEGORIAS_RECEITA, CATEGORIAS_DESPESA))
  ).sort(function (a, b) {
    return a.localeCompare(b, "pt-BR");
  });

  function fillSelectCategoria(selectEl, tipo, currentValue) {
    selectEl.innerHTML = "";
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "Selecione…";
    selectEl.appendChild(ph);
    var list = categoriasPorTipo(tipo).slice();
    if (currentValue && list.indexOf(currentValue) === -1) {
      list.unshift(currentValue);
    }
    list.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      selectEl.appendChild(o);
    });
    if (currentValue) selectEl.value = currentValue;
  }

  function initFiltroCategoriaOptions() {
    var sel = $("#fCat");
    while (sel.options.length > 1) {
      sel.remove(1);
    }
    TODAS_CATEGORIAS.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      sel.appendChild(o);
    });
  }

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  function setSession(token, userId) {
    localStorage.setItem(STORAGE_TOKEN, token);
    localStorage.setItem(STORAGE_USER_ID, String(userId));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER_ID);
  }

  function formatMoney(value) {
    const n = typeof value === "string" ? parseFloat(value) : Number(value);
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(n) ? n : 0);
  }

  function toast(message, type) {
    const el = $("#toast");
    el.textContent = message;
    el.className = type === "error" ? "error" : "ok";
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 4200);
  }

  async function api(path, options) {
    const headers = Object.assign(
      { Accept: "application/json" },
      options && options.headers ? options.headers : {}
    );
    if (options && options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    const res = await fetch(path, Object.assign({}, options, { headers }));
    if (res.status === 204) {
      return null;
    }
    const ct = res.headers.get("Content-Type") || "";
    const isJson = ct.includes("application/json");
    let data;
    if (isJson) {
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
    } else {
      data = await res.text();
    }
    if (!res.ok) {
      if (res.status === 401 && getToken()) {
        clearSession();
        showAuth();
      }
      let msg = res.statusText || "Erro na requisição";
      if (data && typeof data === "object") {
        if (data.error) msg = data.error;
        else if (data.detail) msg = String(data.detail);
        else if (data.details) msg = JSON.stringify(data.details);
      } else if (typeof data === "string" && data.trim()) {
        msg = data;
      }
      throw new Error(msg);
    }
    return data;
  }

  function showAuth() {
    $("#authPanel").classList.remove("hidden");
    $("#appPanel").classList.add("hidden");
    $("#btnLogout").classList.add("hidden");
    $("#userLine").textContent = "Painel web · faça login para continuar";
  }

  function showApp(userId) {
    $("#authPanel").classList.add("hidden");
    $("#appPanel").classList.remove("hidden");
    $("#btnLogout").classList.remove("hidden");
    $("#userLine").textContent =
      "Conectado · usuário #" + (userId || localStorage.getItem(STORAGE_USER_ID) || "—");
  }

  var fpTx, fpIni, fpFim, fpEdit;

  function initDatePickers() {
    if (typeof flatpickr === "undefined") return;
    try {
      if (flatpickr.l10ns && flatpickr.l10ns.pt) {
        flatpickr.localize(flatpickr.l10ns.pt);
      }
    } catch (e) {
      /* ignore locale */
    }
    var opts = {
      dateFormat: "Y-m-d",
      monthSelectorType: "dropdown",
      yearSelectorType: "dropdown",
      disableMobile: true,
      clickOpens: true,
      allowInput: false,
    };
    fpTx = flatpickr("#txData", Object.assign({}, opts, { defaultDate: new Date() }));
    fpIni = flatpickr("#fIni", opts);
    fpFim = flatpickr("#fFim", opts);
    fpEdit = flatpickr("#editData", opts);
  }

  function setDefaultDate() {
    var d = new Date();
    var iso = d.toISOString().slice(0, 10);
    if (fpTx) {
      fpTx.setDate(iso, false);
    } else {
      $("#txData").value = iso;
    }
  }

  async function refreshBalance() {
    const b = await api("/balance");
    $("#valReceitas").textContent = formatMoney(b.total_receitas);
    $("#valDespesas").textContent = formatMoney(b.total_despesas);
    const saldo = parseFloat(b.saldo_final);
    const el = $("#valSaldo");
    el.textContent = formatMoney(b.saldo_final);
    el.classList.remove("positive", "negative");
    if (saldo > 0) el.classList.add("positive");
    else if (saldo < 0) el.classList.add("negative");
  }

  function renderInsights(data) {
    const ul = $("#insightsList");
    ul.innerHTML = "";
    const dia = data.dia_da_semana_que_mais_gasta;
    const cat = data.categoria_com_maior_gasto;
    const media = data.media_gastos_por_dia_com_despesa;

    if (dia) {
      const li = document.createElement("li");
      li.innerHTML =
        "<strong>Dia que mais gasta:</strong> " +
        dia.dia_da_semana +
        " (" +
        formatMoney(dia.total_gasto) +
        ")";
      ul.appendChild(li);
    } else {
      const li = document.createElement("li");
      li.textContent = "Sem despesas registradas para calcular o dia da semana.";
      ul.appendChild(li);
    }

    if (cat) {
      const li = document.createElement("li");
      li.innerHTML =
        "<strong>Maior categoria:</strong> " +
        cat.categoria +
        " (" +
        formatMoney(cat.total_gasto) +
        ")";
      ul.appendChild(li);
    }

    const liM = document.createElement("li");
    liM.innerHTML =
      "<strong>Média de gastos/dia</strong> (dias com despesa): " +
      formatMoney(media);
    ul.appendChild(liM);

    const alertEl = $("#insightAlert");
    if (data.alerta) {
      alertEl.textContent = data.alerta;
      alertEl.classList.remove("hidden");
    } else {
      alertEl.classList.add("hidden");
    }
  }

  async function refreshInsights() {
    const data = await api("/insights");
    renderInsights(data);
  }

  function renderChart(itens) {
    const wrap = $("#chartCategory");
    wrap.innerHTML = "";
    if (!itens || !itens.length) {
      wrap.innerHTML =
        "<p style='color:var(--muted);margin:0'>Nenhuma despesa por categoria no período.</p>";
      return;
    }
    const max = Math.max(
      ...itens.map((i) => parseFloat(i.total)),
      0.01
    );
    itens.forEach((item) => {
      const v = parseFloat(item.total);
      const pct = Math.round((v / max) * 100);
      const row = document.createElement("div");
      row.className = "chart-row";
      row.innerHTML =
        "<span class='name' title='" +
        item.categoria.replace(/'/g, "&#39;") +
        "'>" +
        item.categoria +
        "</span>" +
        "<div class='track'><div class='fill' style='width:" +
        pct +
        "%'></div></div>" +
        "<span class='amt'>" +
        formatMoney(item.total) +
        "</span>";
      wrap.appendChild(row);
    });
  }

  async function refreshChart() {
    const data = await api("/reports/spending-by-category");
    renderChart(data.itens || []);
  }

  function txQuery() {
    const p = new URLSearchParams();
    const tipo = $("#fTipo").value;
    const cat = $("#fCat").value.trim();
    const ini = $("#fIni").value;
    const fim = $("#fFim").value;
    if (tipo) p.set("tipo", tipo);
    if (cat) p.set("categoria", cat);
    if (ini) p.set("start_date", ini);
    if (fim) p.set("end_date", fim);
    const q = p.toString();
    return q ? "?" + q : "";
  }

  function renderTransactions(rows) {
    const tbody = $("#txTableBody");
    tbody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td colspan='6' style='color:var(--muted)'>Nenhum lançamento.</td>";
      tbody.appendChild(tr);
      return;
    }
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const badgeClass = r.tipo === "RECEITA" ? "receita" : "despesa";
      tr.innerHTML =
        "<td>" +
        r.data +
        "</td><td><span class='badge " +
        badgeClass +
        "'>" +
        r.tipo +
        "</span></td><td>" +
        escapeHtml(r.categoria) +
        "</td><td>" +
        formatMoney(r.valor) +
        "</td><td>" +
        escapeHtml(r.descricao || "—") +
        "</td><td class='actions'>" +
        "<button type='button' class='btn btn-ghost btn-sm' data-edit='" +
        r.id +
        "'>Editar</button> " +
        "<button type='button' class='btn btn-danger btn-sm' data-del='" +
        r.id +
        "'>Excluir</button></td>";
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteTx(btn.getAttribute("data-del")));
    });
    tbody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () =>
        openEdit(parseInt(btn.getAttribute("data-edit"), 10))
      );
    });
  }

  function escapeHtml(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  async function refreshTransactions() {
    const rows = await api("/transactions" + txQuery());
    renderTransactions(Array.isArray(rows) ? rows : []);
  }

  async function deleteTx(id) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await api("/transactions/" + id, { method: "DELETE" });
      toast("Lançamento excluído.", "ok");
      await refreshAll();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function openEdit(id) {
    try {
      const row = await api("/transactions/" + id);
      if (!row || !row.id) {
        toast("Lançamento não encontrado.", "error");
        return;
      }
      $("#editId").value = String(row.id);
      $("#editTipo").value = row.tipo;
      $("#editValor").value = String(row.valor);
      fillSelectCategoria($("#editCategoria"), row.tipo, row.categoria);
      if (fpEdit) {
        fpEdit.setDate(row.data, false);
      } else {
        $("#editData").value = row.data;
      }
      $("#editDesc").value = row.descricao || "";
      $("#modalEdit").classList.remove("hidden");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function closeEdit() {
    $("#modalEdit").classList.add("hidden");
  }

  async function refreshAll() {
    try {
      await Promise.all([
        refreshBalance(),
        refreshInsights(),
        refreshTransactions(),
        refreshChart(),
      ]);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.getAttribute("data-tab");
      $("#formLogin").classList.toggle("hidden", name !== "login");
      $("#formRegister").classList.toggle("hidden", name !== "register");
    });
  });

  $("#formLogin").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const body = {
        email: $("#loginEmail").value.trim(),
        senha: $("#loginSenha").value,
      };
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSession(data.access_token, data.user_id);
      showApp(data.user_id);
      setDefaultDate();
      toast("Login realizado.", "ok");
      await refreshAll();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  $("#formRegister").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const body = {
        nome: $("#regNome").value.trim(),
        email: $("#regEmail").value.trim(),
        senha: $("#regSenha").value,
      };
      await api("/auth/register", { method: "POST", body: JSON.stringify(body) });
      $("#loginEmail").value = body.email;
      $("#loginSenha").value = body.senha;
      $$(".tab")[0].click();
      toast("Conta criada. Entrando…", "ok");
      const loginData = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: body.email, senha: body.senha }),
      });
      setSession(loginData.access_token, loginData.user_id);
      showApp(loginData.user_id);
      setDefaultDate();
      await refreshAll();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  $("#btnLogout").addEventListener("click", () => {
    clearSession();
    showAuth();
    toast("Sessão encerrada.", "ok");
  });

  $("#formTx").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      const body = {
        tipo: $("#txTipo").value,
        valor: String($("#txValor").value),
        categoria: $("#txCategoria").value.trim(),
        descricao: $("#txDesc").value.trim(),
        data: $("#txData").value,
      };
      await api("/transactions", { method: "POST", body: JSON.stringify(body) });
      $("#txValor").value = "";
      fillSelectCategoria($("#txCategoria"), $("#txTipo").value, "");
      $("#txDesc").value = "";
      setDefaultDate();
      toast("Lançamento adicionado.", "ok");
      await refreshAll();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  $("#btnFilter").addEventListener("click", () => refreshAll());

  $("#editCancel").addEventListener("click", closeEdit);
  $("#modalEdit").addEventListener("click", (ev) => {
    if (ev.target.id === "modalEdit") closeEdit();
  });

  $("#txTipo").addEventListener("change", function () {
    var t = $("#txTipo").value;
    var prev = $("#txCategoria").value;
    fillSelectCategoria(
      $("#txCategoria"),
      t,
      categoriasPorTipo(t).indexOf(prev) >= 0 ? prev : ""
    );
  });
  $("#editTipo").addEventListener("change", function () {
    var t = $("#editTipo").value;
    var prev = $("#editCategoria").value;
    fillSelectCategoria(
      $("#editCategoria"),
      t,
      categoriasPorTipo(t).indexOf(prev) >= 0 ? prev : ""
    );
  });

  $("#formEditTx").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const id = $("#editId").value;
    try {
      const body = {
        tipo: $("#editTipo").value,
        valor: String($("#editValor").value),
        categoria: $("#editCategoria").value.trim(),
        descricao: $("#editDesc").value.trim(),
        data: $("#editData").value,
      };
      await api("/transactions/" + id, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      closeEdit();
      toast("Lançamento atualizado.", "ok");
      await refreshAll();
    } catch (e) {
      toast(e.message, "error");
    }
  });

  initFiltroCategoriaOptions();
  fillSelectCategoria($("#txCategoria"), $("#txTipo").value, "");
  initDatePickers();

  if (getToken()) {
    showApp();
    setDefaultDate();
    refreshAll();
  } else {
    showAuth();
    setDefaultDate();
  }
})();
