import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("observability/grafana/dashboards");
const P = { type: "prometheus", uid: "Prometheus" };
const L = { type: "loki", uid: "Loki" };

function target(expr, legendFormat = "", refId = "A", instant = false) {
  return { datasource: P, expr, legendFormat, refId, instant };
}

function grid(x, y, w, h) {
  return { x, y, w, h };
}

function thresholds(steps) {
  return { mode: "absolute", steps };
}

function stat(id, title, pos, expr, unit = "short", description = "", opts = {}) {
  return {
    id,
    type: "stat",
    title,
    description,
    datasource: P,
    gridPos: pos,
    targets: [target(expr, "", "A", opts.instant ?? false)],
    fieldConfig: {
      defaults: {
        unit,
        decimals: opts.decimals ?? 1,
        thresholds: opts.thresholds,
      },
      overrides: [],
    },
    options: {
      colorMode: opts.colorMode ?? "value",
      graphMode: opts.graphMode ?? "area",
      justifyMode: "center",
      orientation: "auto",
      reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
      textMode: "auto",
    },
  };
}

function timeseries(id, title, pos, targets, unit = "short", description = "", opts = {}) {
  return {
    id,
    type: "timeseries",
    title,
    description,
    datasource: P,
    gridPos: pos,
    targets,
    fieldConfig: {
      defaults: {
        unit,
        decimals: opts.decimals ?? 2,
        min: opts.min,
        thresholds: opts.thresholds,
        custom: {
          drawStyle: "line",
          lineInterpolation: "smooth",
          fillOpacity: opts.fillOpacity ?? 12,
          showPoints: "never",
          lineWidth: 2,
        },
      },
      overrides: [],
    },
    options: {
      legend: {
        displayMode: "table",
        placement: "bottom",
        calcs: ["lastNotNull", "max"],
      },
      tooltip: { mode: "multi", sort: "desc" },
    },
  };
}

function barchart(id, title, pos, expr, unit = "short", description = "") {
  return {
    id,
    type: "barchart",
    title,
    description,
    datasource: P,
    gridPos: pos,
    targets: [target(expr, "{{__name__}}", "A", true)],
    fieldConfig: {
      defaults: { unit, decimals: 1 },
      overrides: [],
    },
    options: {
      orientation: "horizontal",
      legend: { displayMode: "hidden" },
      tooltip: { mode: "single", sort: "desc" },
    },
  };
}

function table(id, title, pos, targets, description = "") {
  return {
    id,
    type: "table",
    title,
    description,
    datasource: P,
    gridPos: pos,
    targets,
    fieldConfig: { defaults: { unit: "short", decimals: 2 }, overrides: [] },
    options: {
      showHeader: true,
      cellHeight: "sm",
      footer: { show: false },
      sortBy: [{ desc: true, displayName: "Value" }],
    },
  };
}

function text(id, title, pos, markdown) {
  return {
    id,
    type: "text",
    title,
    gridPos: pos,
    options: { mode: "markdown", content: markdown },
  };
}

function dashboard(uid, title, tags, panels, extra = {}) {
  return {
    uid,
    title,
    schemaVersion: 39,
    version: 1,
    refresh: "30s",
    timezone: "browser",
    tags: ["secp", "premium", ...tags],
    time: { from: "now-6h", to: "now" },
    templating: { list: extra.variables ?? [] },
    panels,
  };
}

function variable(name, label, query, includeAll = true) {
  return {
    name,
    label,
    type: "query",
    datasource: P,
    query,
    refresh: 1,
    includeAll,
    allValue: ".*",
    multi: includeAll,
    current: includeAll
      ? { selected: true, text: "All", value: "$__all" }
      : undefined,
  };
}

const p95 =
  'histogram_quantile(0.95, sum by (le, route) (rate(secp_http_request_duration_seconds_bucket{route=~"$route"}[5m])))';
const p95Func =
  'histogram_quantile(0.95, sum by (le, funcionalidade) (rate(secp_http_request_duration_by_functionality_seconds_bucket{funcionalidade=~"$funcionalidade"}[5m])))';

const dashboards = [
  dashboard(
    "secp-bullmq-premium",
    "SECP - Filas BullMQ Premium",
    ["bullmq", "filas"],
    [
      text(
        1,
        "Como ler",
        grid(0, 0, 24, 3),
        "Fila BullMQ e a esteira de jobs assíncronos do SECP. `waiting` significa aguardando execução, `active` em execução, `delayed` agendado para o futuro e `failed` falhou e precisa atenção.",
      ),
      stat(2, "Saúde das filas", grid(0, 3, 4, 4), 'avg(secp_queue_healthy{queue=~"$queue"})', "percentunit", "1 significa que a coleta das métricas da fila respondeu.", { decimals: 2, colorMode: "background", thresholds: thresholds([{ color: "red", value: null }, { color: "yellow", value: 0.95 }, { color: "green", value: 1 }]) }),
      stat(3, "Jobs ativos", grid(4, 3, 4, 4), 'sum(secp_queue_jobs{queue=~"$queue",state="active"})', "short", "Trabalhos em execução agora.", { decimals: 0 }),
      stat(4, "Aguardando", grid(8, 3, 4, 4), 'sum(secp_queue_jobs{queue=~"$queue",state="waiting"})', "short", "Backlog que ainda não começou.", { decimals: 0, colorMode: "background", thresholds: thresholds([{ color: "green", value: null }, { color: "yellow", value: 50 }, { color: "red", value: 200 }]) }),
      stat(5, "Falhados", grid(12, 3, 4, 4), 'sum(secp_queue_jobs{queue=~"$queue",state="failed"})', "short", "Jobs com erro acumulado por fila.", { decimals: 0, colorMode: "background", thresholds: thresholds([{ color: "green", value: null }, { color: "yellow", value: 1 }, { color: "red", value: 10 }]) }),
      stat(6, "Agendados", grid(16, 3, 4, 4), 'sum(secp_queue_jobs{queue=~"$queue",state="delayed"})', "short", "Jobs programados para execução futura.", { decimals: 0 }),
      stat(7, "Pausados", grid(20, 3, 4, 4), 'sum(secp_queue_jobs{queue=~"$queue",state="paused"})', "short", "Jobs em filas pausadas.", { decimals: 0 }),
      timeseries(8, "Estados das filas no tempo", grid(0, 7, 14, 9), [target('sum by (queue, state) (secp_queue_jobs{queue=~"$queue"})', "{{queue}} - {{state}}")], "short", "Evolução do volume de jobs por estado."),
      barchart(9, "Backlog atual por fila", grid(14, 7, 10, 9), 'sort_desc(sum by (queue) (secp_queue_jobs{queue=~"$queue",state=~"waiting|delayed"}))', "short", "Filas com maior acúmulo agora."),
      table(10, "Tabela operacional das filas", grid(0, 16, 24, 8), [target('sum by (queue, state) (secp_queue_jobs{queue=~"$queue"})', "{{queue}} {{state}}", "A", true), target('secp_queue_healthy{queue=~"$queue"}', "healthy {{queue}}", "B", true)], "Leitura detalhada para suporte operacional."),
    ],
    { variables: [variable("queue", "Fila", "label_values(secp_queue_jobs, queue)") ] },
  ),
  dashboard(
    "secp-http-rotas-premium",
    "SECP - Latências e Requisições por Rota Premium",
    ["http", "rotas"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Rotas HTTP medidas pelo SECP. `p95` é o tempo abaixo do qual 95% das requisições terminaram; se o p95 de uma rota é 2s, 95 de cada 100 chamadas levaram até 2s."),
      stat(2, "Requisições/min", grid(0, 3, 6, 4), 'sum(rate(secp_http_requests_total{route=~"$route"}[5m])) * 60', "reqpm", "Volume médio recente.", { decimals: 1 }),
      stat(3, "p95 geral", grid(6, 3, 6, 4), 'histogram_quantile(0.95, sum by (le) (rate(secp_http_request_duration_seconds_bucket{route=~"$route"}[5m])))', "s", "Tempo de resposta percebido pela maioria dos usuários.", { decimals: 2, colorMode: "background", thresholds: thresholds([{ color: "green", value: null }, { color: "yellow", value: 1 }, { color: "red", value: 3 }]) }),
      stat(4, "Erros 5xx/min", grid(12, 3, 6, 4), 'sum(rate(secp_http_requests_total{route=~"$route",status=~"5.."}[5m])) * 60', "reqpm", "Falhas do servidor.", { decimals: 2, colorMode: "background", thresholds: thresholds([{ color: "green", value: null }, { color: "yellow", value: 0.1 }, { color: "red", value: 1 }]) }),
      stat(5, "Em andamento", grid(18, 3, 6, 4), 'sum(secp_http_requests_in_flight{route=~"$route"})', "short", "Chamadas abertas neste instante.", { decimals: 0 }),
      timeseries(6, "p95 por rota", grid(0, 7, 12, 9), [target(p95, "{{route}}")], "s", "Rotas mais lentas no período."),
      timeseries(7, "Requisições por rota", grid(12, 7, 12, 9), [target('sum by (route) (rate(secp_http_requests_total{route=~"$route"}[5m])) * 60', "{{route}}")], "reqpm", "Volume de chamadas por rota."),
      timeseries(8, "Erros por rota", grid(0, 16, 12, 8), [target('sum by (route, status) (rate(secp_http_requests_total{route=~"$route",status=~"4..|5.."}[5m])) * 60', "{{route}} - {{status}}")], "reqpm", "Erros de cliente e servidor."),
      barchart(9, "Top rotas por volume", grid(12, 16, 12, 8), 'topk(15, sum by (route) (increase(secp_http_requests_total{route=~"$route"}[$__range])))', "short", "Rotas mais acessadas na janela selecionada."),
    ],
    { variables: [variable("route", "Rota", "label_values(secp_http_requests_total, route)") ] },
  ),
  dashboard(
    "secp-funcionalidades-latencia-premium",
    "SECP - Tempo de Resposta por Funcionalidade Premium",
    ["funcionalidades", "latencia"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Agrupa rotas em funcionalidades do SECP. `p50` é a mediana; `p95` destaca lentidão percebida por usuários mesmo quando a média parece boa."),
      stat(2, "p95 geral", grid(0, 3, 6, 4), 'histogram_quantile(0.95, sum by (le) (rate(secp_http_request_duration_by_functionality_seconds_bucket{funcionalidade=~"$funcionalidade"}[5m])))', "s", "Tempo p95 de todas as funcionalidades filtradas.", { decimals: 2 }),
      stat(3, "p50 geral", grid(6, 3, 6, 4), 'histogram_quantile(0.50, sum by (le) (rate(secp_http_request_duration_by_functionality_seconds_bucket{funcionalidade=~"$funcionalidade"}[5m])))', "s", "Tempo mediano.", { decimals: 2 }),
      stat(4, "Mais lenta p95", grid(12, 3, 6, 4), `max(${p95Func})`, "s", "Maior p95 entre funcionalidades.", { decimals: 2 }),
      stat(5, "Amostras/min", grid(18, 3, 6, 4), 'sum(rate(secp_http_request_duration_by_functionality_seconds_count{funcionalidade=~"$funcionalidade"}[5m])) * 60', "reqpm", "Volume usado para calcular latência.", { decimals: 1 }),
      timeseries(6, "p95 por funcionalidade", grid(0, 7, 12, 9), [target(p95Func, "{{funcionalidade}}")], "s", "Comparação de lentidão por área funcional."),
      timeseries(7, "p50 por funcionalidade", grid(12, 7, 12, 9), [target('histogram_quantile(0.50, sum by (le, funcionalidade) (rate(secp_http_request_duration_by_functionality_seconds_bucket{funcionalidade=~"$funcionalidade"}[5m])))', "{{funcionalidade}}")], "s", "Experiência típica de resposta."),
      table(8, "Ranking p95 atual", grid(0, 16, 24, 8), [target(`sort_desc(${p95Func})`, "{{funcionalidade}}", "A", true)], "Ranking instantâneo das funcionalidades mais lentas."),
    ],
    { variables: [variable("funcionalidade", "Funcionalidade", "label_values(secp_http_requests_by_functionality_total, funcionalidade)") ] },
  ),
  dashboard(
    "secp-funcionalidades-volume-premium",
    "SECP - Volume por Funcionalidade Premium",
    ["funcionalidades", "volume"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Mostra onde o SECP está sendo mais usado. Use para entender demanda por funcionalidade e identificar picos anormais."),
      stat(2, "Requisições/min", grid(0, 3, 6, 4), 'sum(rate(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade"}[5m])) * 60', "reqpm", "Volume médio recente.", { decimals: 1 }),
      stat(3, "Total no período", grid(6, 3, 6, 4), 'sum(increase(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade"}[$__range]))', "short", "Total na janela selecionada.", { decimals: 0 }),
      stat(4, "Erros/min", grid(12, 3, 6, 4), 'sum(rate(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade",status=~"4..|5.."}[5m])) * 60', "reqpm", "Erros por minuto.", { decimals: 2 }),
      stat(5, "Funcionalidades ativas", grid(18, 3, 6, 4), 'count(count by (funcionalidade) (rate(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade"}[5m]) > 0))', "short", "Funcionalidades com tráfego recente.", { decimals: 0 }),
      timeseries(6, "Volume por funcionalidade", grid(0, 7, 14, 9), [target('sum by (funcionalidade) (rate(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade"}[5m])) * 60', "{{funcionalidade}}")], "reqpm", "Tráfego por área do sistema."),
      barchart(7, "Top funcionalidades por uso", grid(14, 7, 10, 9), 'topk(15, sum by (funcionalidade) (increase(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade"}[$__range])))', "short", "Funcionalidades mais usadas no período."),
      timeseries(8, "Erros por funcionalidade", grid(0, 16, 24, 8), [target('sum by (funcionalidade, status) (rate(secp_http_requests_by_functionality_total{funcionalidade=~"$funcionalidade",status=~"4..|5.."}[5m])) * 60', "{{funcionalidade}} - {{status}}")], "reqpm", "Erros separados por funcionalidade e status HTTP."),
    ],
    { variables: [variable("funcionalidade", "Funcionalidade", "label_values(secp_http_requests_by_functionality_total, funcionalidade)") ] },
  ),
  dashboard(
    "secp-usuarios-ativos-premium",
    "SECP - Usuários Conectados e Ativos Premium",
    ["usuarios", "atividade"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Usuário ativo é quem realizou requisição autenticada dentro da janela operacional configurada no SECP, por padrão 15 minutos. Não mede sessão aberta parada no navegador."),
      stat(2, "Usuários ativos", grid(0, 3, 6, 4), "sum(secp_active_users)", "short", "Total ativo recente.", { decimals: 0 }),
      stat(3, "Seccionais ativas", grid(6, 3, 6, 4), "count(secp_active_users_by_orgao > 0)", "short", "Órgãos com usuários ativos.", { decimals: 0 }),
      stat(4, "Sessões conhecidas", grid(12, 3, 6, 4), "secp_active_sessions", "short", "Mesmo total em métrica legada.", { decimals: 0 }),
      stat(5, "Requisições autenticadas/min", grid(18, 3, 6, 4), 'sum(rate(secp_http_requests_by_user_total[5m])) * 60', "reqpm", "Tráfego identificado por usuário.", { decimals: 1 }),
      timeseries(6, "Usuários ativos por seccional", grid(0, 7, 14, 9), [target('sum by (orgao) (secp_active_users_by_orgao{orgao=~"$orgao"})', "{{orgao}}")], "short", "Distribuição de usuários ativos por localidade."),
      table(7, "Usuários ativos agora", grid(14, 7, 10, 9), [target('secp_active_users{orgao=~"$orgao"}', "{{usuario}} - {{orgao}}", "A", true)], "Lista operacional de usuários ativos recentes."),
      timeseries(8, "Atividade autenticada por seccional", grid(0, 16, 24, 8), [target('sum by (orgao) (rate(secp_http_requests_by_user_total{orgao=~"$orgao"}[5m])) * 60', "{{orgao}}")], "reqpm", "Volume de requisições autenticadas por localidade."),
    ],
    { variables: [variable("orgao", "Seccional/órgão", "label_values(secp_active_users_by_orgao, orgao)") ] },
  ),
  dashboard(
    "secp-top-usuarios-premium",
    "SECP - Usuários com Mais Requisições Premium",
    ["usuarios", "top"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Ranking de uso por usuário autenticado. Serve para suporte, auditoria operacional e identificação de automações ou telas muito usadas."),
      stat(2, "Requisições autenticadas", grid(0, 3, 6, 4), 'sum(increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range]))', "short", "Total identificado no período.", { decimals: 0 }),
      stat(3, "Usuários no período", grid(6, 3, 6, 4), 'count(count by (usuario) (increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range]) > 0))', "short", "Usuários com atividade.", { decimals: 0 }),
      stat(4, "Erros por usuários", grid(12, 3, 6, 4), 'sum(increase(secp_http_requests_by_user_total{orgao=~"$orgao",status=~"4..|5.."}[$__range]))', "short", "Erros em requisições autenticadas.", { decimals: 0 }),
      stat(5, "Req/min atual", grid(18, 3, 6, 4), 'sum(rate(secp_http_requests_by_user_total{orgao=~"$orgao"}[5m])) * 60', "reqpm", "Ritmo recente.", { decimals: 1 }),
      barchart(6, "Top usuários por requisições", grid(0, 7, 12, 10), 'topk(20, sum by (usuario) (increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range])))', "short", "Quem mais fez chamadas no período."),
      barchart(7, "Top usuários por erros", grid(12, 7, 12, 10), 'topk(20, sum by (usuario) (increase(secp_http_requests_by_user_total{orgao=~"$orgao",status=~"4..|5.."}[$__range])))', "short", "Usuários com mais respostas de erro."),
      table(8, "Detalhe por usuário e funcionalidade", grid(0, 17, 24, 9), [target('sort_desc(sum by (usuario, orgao, funcionalidade) (increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range])))', "{{usuario}} - {{orgao}} - {{funcionalidade}}", "A", true)], "Que usuários usam quais funcionalidades."),
    ],
    { variables: [variable("orgao", "Seccional/órgão", "label_values(secp_http_requests_by_user_total, orgao)") ] },
  ),
  dashboard(
    "secp-workers-premium",
    "SECP - Workers e Containers Premium",
    ["workers", "containers"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Acompanha consumo dos workers e do web. Útil para saber se uma rotina está consumindo CPU/memória ou reiniciando."),
      stat(2, "CPU workers", grid(0, 3, 6, 4), 'sum(rate(container_cpu_usage_seconds_total{name=~"$worker"}[5m]))', "cores", "CPU consumida pelos containers filtrados.", { decimals: 2 }),
      stat(3, "Memória workers", grid(6, 3, 6, 4), 'sum(container_memory_working_set_bytes{name=~"$worker"})', "bytes", "Memória física em uso.", { decimals: 1 }),
      stat(4, "Containers", grid(12, 3, 6, 4), 'count(container_last_seen{name=~"$worker"})', "short", "Containers observados pelo cAdvisor.", { decimals: 0 }),
      stat(5, "Reinícios aproximados", grid(18, 3, 6, 4), 'sum(changes(container_start_time_seconds{name=~"$worker"}[$__range]))', "short", "Mudanças no horário de início indicam recriação/restart.", { decimals: 0 }),
      timeseries(6, "CPU por container", grid(0, 7, 12, 9), [target('sum by (name) (rate(container_cpu_usage_seconds_total{name=~"$worker"}[5m]))', "{{name}}")], "cores", "Uso de CPU ao longo do tempo."),
      timeseries(7, "Memória por container", grid(12, 7, 12, 9), [target('container_memory_working_set_bytes{name=~"$worker"}', "{{name}}")], "bytes", "Uso de memória ao longo do tempo."),
      timeseries(8, "Rede recebida/enviada", grid(0, 16, 24, 8), [target('sum by (name) (rate(container_network_receive_bytes_total{name=~"$worker"}[5m]))', "rx {{name}}"), target('sum by (name) (rate(container_network_transmit_bytes_total{name=~"$worker"}[5m]))', "tx {{name}}", "B")], "Bps", "Tráfego de rede dos containers."),
    ],
    { variables: [variable("worker", "Container", 'label_values(container_memory_working_set_bytes{name=~"secp-worker-.*|secp-web"}, name)') ] },
  ),
  dashboard(
    "secp-rotinas-logs-premium",
    "SECP - Logs de Rotinas Premium",
    ["logs", "rotinas"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Logs operacionais dos workers e rotinas. Use junto das filas: backlog mostra acúmulo; logs mostram causa provável."),
      {
        id: 2,
        type: "logs",
        title: "Logs recentes de rotinas",
        description: "Eventos recentes envolvendo workers, filas, coletas, relatórios, SARH, AFD e recálculos.",
        datasource: L,
        gridPos: grid(0, 3, 24, 16),
        targets: [{ datasource: L, expr: '{service="secp"} |~ "worker|Job|fila|reprocess|relatorio|SARH|AFD|calendario|COLETA|Tempo de|Erro|Falha"', refId: "A" }],
        options: {
          dedupStrategy: "none",
          enableLogDetails: true,
          prettifyLogMessage: true,
          showCommonLabels: false,
          showLabels: false,
          showTime: true,
          sortOrder: "Descending",
          wrapLogMessage: true,
        },
      },
    ],
  ),
  dashboard(
    "secp-seccional-monitoramento-premium",
    "SECP - Monitoramento por Seccional Premium",
    ["seccional"],
    [
      text(1, "Como ler", grid(0, 0, 24, 3), "Visão filtrável por seccional/órgão. Mostra atividade autenticada, usuários ativos e funcionalidades mais usadas naquela localidade."),
      stat(2, "Usuários ativos", grid(0, 3, 6, 4), 'sum(secp_active_users_by_orgao{orgao=~"$orgao"})', "short", "Ativos recentes na seccional.", { decimals: 0 }),
      stat(3, "Requisições/min", grid(6, 3, 6, 4), 'sum(rate(secp_http_requests_by_user_total{orgao=~"$orgao"}[5m])) * 60', "reqpm", "Tráfego autenticado local.", { decimals: 1 }),
      stat(4, "Erros/min", grid(12, 3, 6, 4), 'sum(rate(secp_http_requests_by_user_total{orgao=~"$orgao",status=~"4..|5.."}[5m])) * 60', "reqpm", "Erros locais.", { decimals: 2 }),
      stat(5, "Usuários no período", grid(18, 3, 6, 4), 'count(count by (usuario) (increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range]) > 0))', "short", "Usuários com uso no período.", { decimals: 0 }),
      timeseries(6, "Volume por funcionalidade na seccional", grid(0, 7, 12, 9), [target('sum by (funcionalidade) (rate(secp_http_requests_by_user_total{orgao=~"$orgao"}[5m])) * 60', "{{funcionalidade}}")], "reqpm", "Funcionalidades mais usadas localmente."),
      barchart(7, "Top usuários da seccional", grid(12, 7, 12, 9), 'topk(15, sum by (usuario) (increase(secp_http_requests_by_user_total{orgao=~"$orgao"}[$__range])))', "short", "Usuários com maior volume local."),
      table(8, "Usuários ativos da seccional", grid(0, 16, 24, 8), [target('secp_active_users{orgao=~"$orgao"}', "{{usuario}}", "A", true)], "Lista de ativos recentes na seccional filtrada."),
    ],
    { variables: [variable("orgao", "Seccional/órgão", "label_values(secp_http_requests_by_user_total, orgao)", false)] },
  ),
];

const infra = dashboard("secp-infra", "SECP - Infraestrutura", ["infra"], [
  text(1, "Como ler", grid(0, 0, 24, 3), "Infraestrutura do SECP: host, containers, Redis, probes externos e pool PostgreSQL gerenciado pelo PgBouncer."),
  timeseries(2, "CPU host", grid(0, 3, 12, 8), [target('100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)', "{{instance}}")], "percent", "Uso de CPU do servidor."),
  timeseries(3, "Memória host", grid(12, 3, 12, 8), [target("1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)", "{{instance}}")], "percentunit", "Memória consumida no host."),
  timeseries(4, "Uso de disco", grid(0, 11, 12, 8), [target('1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"})', "{{mountpoint}}")], "percentunit", "Ocupação dos discos/mounts relevantes."),
  timeseries(5, "Conexões PostgreSQL via PgBouncer", grid(12, 11, 12, 8), [target('sum by (state) (secp_pgbouncer_pool_clients{state=~"active|waiting"})', "clientes {{state}}"), target('sum by (state) (secp_pgbouncer_pool_servers{state=~"active|idle|used|tested|login"})', "servidores {{state}}", "B")], "short", "Mostra o pool gerenciado pelo PgBouncer. Clientes são conexões da aplicação; servidores são conexões abertas do PgBouncer para o PostgreSQL."),
  timeseries(6, "Espera no pool PgBouncer", grid(0, 19, 12, 8), [target("sum by (database, user) (secp_pgbouncer_pool_wait_seconds)", "{{database}} / {{user}}")], "s", "Espera indica pressão no pool; valores persistentes sugerem falta de conexões disponíveis."),
  timeseries(7, "Redis memória", grid(12, 19, 12, 8), [target("redis_memory_used_bytes", "{{instance}}")], "bytes", "Memória usada pelo Redis."),
  timeseries(8, "Blackbox probes", grid(0, 27, 24, 7), [target("probe_success", "{{instance}}")], "short", "Sondas HTTP externas: 1 é sucesso, 0 é falha."),
]);

dashboards.push(infra);

fs.mkdirSync(outDir, { recursive: true });
for (const item of dashboards) {
  const filename = `${item.uid}.json`;
  fs.writeFileSync(path.join(outDir, filename), `${JSON.stringify(item, null, 2)}\n`);
  console.log(`generated ${filename}`);
}
