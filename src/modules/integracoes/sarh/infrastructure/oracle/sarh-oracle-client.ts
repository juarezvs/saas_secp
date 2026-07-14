import type {
  SarhCargoDto,
  SarhAfastamentoDto,
  SarhCalendarioDto,
  SarhChefiaDto,
  SarhEmpresaDto,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhPayloadCompleto,
  SarhServidorDto,
  SarhTipoAfastamentoDto,
  SarhTipoDto,
} from "../../domain/sarh.types";
import type { Connection } from "oracledb";

type OracleDbModule = typeof import("oracledb");
type OracleDbImport = OracleDbModule & {
  default?: OracleDbModule;
};

type OracleRow = Record<string, unknown>;

type ReadableBlob = {
  on(
    event: "data",
    listener: (chunk: Buffer | Uint8Array | string) => void,
  ): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
};

export type SarhOracleClientOptions = {
  username?: string;
  password?: string;
  connectString?: string;
  oracleHome?: string;
  siglaLocalidade?: string;
};

const TIPOS_LOTACAO_SERVIDOR_FORA = [11, 12, 13];
const FILTRO_MATRICULA_PESSOA_PONTO_SARH =
  "(regexp_like({coluna}, '[0-9]$') or upper({coluna}) like '%ES' or upper({coluna}) like '%VO' or upper({coluna}) like '%PS')";

let oracleClientInicializado = false;

function isReadableBlob(value: unknown): value is ReadableBlob {
  return (
    typeof value === "object" &&
    value !== null &&
    "on" in value &&
    typeof (value as { on?: unknown }).on === "function"
  );
}

async function bufferFromReadableBlob(blob: ReadableBlob) {
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    blob.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    blob.on("end", () => resolve(Buffer.concat(chunks)));
    blob.on("error", reject);
  });
}

export class SarhOracleClient {
  private readonly username: string;
  private readonly password: string;
  private readonly connectString: string;
  private readonly oracleHome?: string;
  private readonly siglaLocalidade: string;

  constructor(options: SarhOracleClientOptions = {}) {
    this.username =
      options.username ??
      process.env.SARH_DB_USERNAME ??
      process.env.DB_USERNAME ??
      "";
    this.password =
      options.password ??
      process.env.SARH_DB_PASSWORD ??
      process.env.DB_PASSWORD ??
      "";
    this.connectString =
      options.connectString ??
      process.env.SARH_DB_TNS_ALIAS ??
      process.env.DB_TNS_ALIAS ??
      "";
    this.oracleHome =
      options.oracleHome ??
      process.env.SARH_ORACLE_HOME ??
      process.env.ORACLE_HOME;
    this.siglaLocalidade =
      options.siglaLocalidade ??
      process.env.SARH_SIGLA_LOCALIDADE ??
      process.env.SIGLA_LOCALIDADE ??
      "AM";
  }

  async buscarEmpresas(): Promise<SarhEmpresaDto[]> {
    return this.buscarLotacoesPorWhere("l.lota_tipo_lotacao = 1");
  }

  async buscarLotacoes(): Promise<SarhLotacaoDto[]> {
    return this.buscarLotacoesPorWhere("1 = 1");
  }

  async buscarCargos(): Promise<SarhCargoDto[]> {
    const rows = await this.query<SarhCargoDto>(`
      select
        c.carg_cod_cargo as "id",
        c.carg_dsc_cargo as "cargoDescricao"
      from sarh.rh_cargo c
      order by c.carg_cod_cargo
    `);

    return rows;
  }

  async buscarServidores(): Promise<SarhServidorDto[]> {
    const rows = await this.query<OracleRow>(
      `
      with funcao_vigente as (
        select *
        from (
          select
            mf.mvfu_matricula_folha,
            mf.mvfu_func_cod_func_exerce,
            mf.mvfu_hifc_grupo_func_conf,
            mf.mvfu_hifc_categ_func_conf,
            mf.mvfu_hifc_cod_func_conf,
            mf.mvfu_nfun_cod_nome_funcao,
            nfun.nfun_dsc_funcao,
            sitf.sitf_dsc_sit_func_conf,
            mf.mvfu_dat_inic_exerc,
            row_number() over (
              partition by mf.mvfu_matricula_folha
              order by mf.mvfu_dat_inic_exerc desc nulls last, mf.mvfu_cod_mov_func desc
            ) as rn
          from sarh.rh_movimentacao_funcional mf
          left join sarh.rh_funcao nfun
            on nfun.nfun_cod_nome_funcao = mf.mvfu_nfun_cod_nome_funcao
          left join sarh.rh_situacao_funcao_confianca sitf
            on sitf.sitf_cod_sit_func_conf = mf.mvfu_sitf_cod_sit_func_conf
          where upper(mf.mvfu_func_sigla_secao_exerce) like upper(:siglaLocalidade) || '%'
            and mf.mvfu_matricula_folha is not null
            and mf.mvfu_hifc_categ_func_conf is not null
            and (
              upper(mf.mvfu_hifc_categ_func_conf) like 'FC%'
              or upper(mf.mvfu_hifc_categ_func_conf) like 'CJ%'
            )
            and (mf.mvfu_dat_fim_exerc is null or mf.mvfu_dat_fim_exerc >= trunc(sysdate))
            and (mf.mvfu_dat_fim_mov is null or mf.mvfu_dat_fim_mov >= trunc(sysdate))
        )
        where rn = 1
      )
      select
        s.nu_matr_servidor as "matricula",
        s.no_servidor as "nome",
        s.flag_ativo as "ativo",
        f.func_pess_c_p_f as "cpf",
        d.cape_nascimento as "dataNascimento",
        cf.cafu_cod_funcionario as "codigoFuncionario",
        cf.cafu_cod_lotacao as "locatacaoId",
        l.lota_lota_cod_lotacao_pai as "locatacaoPai",
        l.lota_dsc_lotacao as "lotacaoDescricao",
        l.lota_sigla_lotacao as "lotacaoSigla",
        t.tlot_desc_tipo_lotacao as "lotacaoTipo",
        cf.cafu_carg_cod_cargo as "cargoId",
        c.carg_dsc_cargo as "cargoDescricao",
        cf.cafu_prov_cod_provimento as "codigoProvimento",
        prov.prov_dsc_provimento as "descricaoProvimento",
        cf.cafu_perf_cod_situacao as "codigoSituacao",
        situ.situ_dsc_situacao as "descricaoSituacao",
        cf.cafu_perf_tipo as "perfilTipo",
        fv.mvfu_hifc_grupo_func_conf as "funcaoAtualGrupo",
        fv.mvfu_hifc_categ_func_conf as "funcaoAtualCategoria",
        fv.mvfu_hifc_cod_func_conf as "funcaoAtualCodigo",
        fv.nfun_dsc_funcao as "funcaoAtualDescricao",
        fv.sitf_dsc_sit_func_conf as "funcaoAtualSituacao",
        fv.mvfu_dat_inic_exerc as "funcaoAtualInicio"
      from sarh.serv_pessoal s
      left join sarh.rh_funcionario f
        on f.func_matricula_folha = s.nu_matr_servidor
      left join sarh.rh_cargo_pessoal d
        on d.cape_cpf = f.func_pess_c_p_f
      left join sarh.rh_cargo_funcionario cf
        on cf.cafu_matricula_folha = s.nu_matr_servidor
      left join sarh.rh_lotacao l
        on l.lota_cod_lotacao = cf.cafu_cod_lotacao
      left join sarh.rh_tipo_lotacao t
        on t.tlot_tipo_lotacao = l.lota_tipo_lotacao
      left join sarh.rh_cargo c
        on c.carg_cod_cargo = cf.cafu_carg_cod_cargo
      left join sarh.rh_provimento prov
        on prov.prov_cod_provimento = cf.cafu_prov_cod_provimento
      left join sarh.rh_situacao situ
        on situ.situ_cod_situacao = cf.cafu_perf_cod_situacao
      left join funcao_vigente fv
        on fv.mvfu_matricula_folha = s.nu_matr_servidor
      where s.flag_ativo = 1
        and upper(s.nu_matr_servidor) like upper(:siglaLocalidade) || '%'
        and ${this.filtroMatriculaPessoaPontoSarh("s.nu_matr_servidor")}
        and (
          l.lota_tipo_lotacao is null
          or l.lota_tipo_lotacao not in (${TIPOS_LOTACAO_SERVIDOR_FORA.join(", ")})
        )
      order by s.no_servidor
      `,
      { siglaLocalidade: this.siglaLocalidade },
    );

    return rows.map((row) => ({
      matricula: String(row.matricula ?? ""),
      nome: String(row.nome ?? ""),
      nomeSocial: String(row.nome ?? ""),
      ativo: this.toBoolean(row.ativo),
      cpf: this.toCpf(row.cpf),
      dataNascimento: this.toDateString(row.dataNascimento),
      codigoFuncionario: this.toNumberOrNull(row.codigoFuncionario),
      locatacaoId: this.toNumberOrNull(row.locatacaoId),
      locatacaoPai: this.toNumberOrNull(row.locatacaoPai),
      lotacaoDescricao: this.toStringOrNull(row.lotacaoDescricao),
      lotacaoSigla: this.toStringOrNull(row.lotacaoSigla),
      lotacaoTipo: this.toStringOrNull(row.lotacaoTipo),
      cargoId: this.toNumberOrNull(row.cargoId),
      cargoDescricao: this.toStringOrNull(row.cargoDescricao),
      codigoProvimento: this.toNumberOrNull(row.codigoProvimento),
      descricaoProvimento: this.toStringOrNull(row.descricaoProvimento),
      codigoSituacao: this.toNumberOrNull(row.codigoSituacao),
      descricaoSituacao: this.toStringOrNull(row.descricaoSituacao),
      perfilTipo: this.toStringOrNull(row.perfilTipo),
      funcaoAtualGrupo: this.toStringOrNull(row.funcaoAtualGrupo),
      funcaoAtualCategoria: this.toStringOrNull(row.funcaoAtualCategoria),
      funcaoAtualCodigo: this.toStringOrNull(row.funcaoAtualCodigo),
      funcaoAtualDescricao: this.toStringOrNull(row.funcaoAtualDescricao),
      funcaoAtualSituacao: this.toStringOrNull(row.funcaoAtualSituacao),
      funcaoAtualInicio: this.toDateString(row.funcaoAtualInicio),
    }));
  }

  async buscarLotacoesServidores(): Promise<SarhLotacaoServidorDto[]> {
    const rows = await this.query<OracleRow>(
      `
      select
        cf.cafu_matricula_folha as "matricula",
        cf.cafu_cod_lotacao as "lotacaoId",
        cf.cafu_carg_cod_cargo as "cargoId",
        l.lota_lota_cod_lotacao_pai as "lotacaoIdPai",
        l.lota_dsc_lotacao as "lotacaoDescricao",
        l.lota_sigla_lotacao as "lotacaoSigla",
        l.lota_dat_inicio as "lotacaoDataInicio",
        l.lota_dat_fim as "lotacaoDataFim",
        l.lota_e_mail as "lotacaoEmail",
        t.tlot_tipo_lotacao as "tipoId",
        t.tlot_desc_tipo_lotacao as "tipoNome",
        c.carg_dsc_cargo as "cargoDescricao"
      from sarh.rh_cargo_funcionario cf
      left join sarh.rh_lotacao l
        on l.lota_cod_lotacao = cf.cafu_cod_lotacao
      left join sarh.rh_tipo_lotacao t
        on t.tlot_tipo_lotacao = l.lota_tipo_lotacao
      left join sarh.rh_cargo c
        on c.carg_cod_cargo = cf.cafu_carg_cod_cargo
      join sarh.serv_pessoal s
        on s.nu_matr_servidor = cf.cafu_matricula_folha
       and s.flag_ativo = 1
      where upper(cf.cafu_matricula_folha) like upper(:siglaLocalidade) || '%'
        and ${this.filtroMatriculaPessoaPontoSarh("cf.cafu_matricula_folha")}
      order by cf.cafu_matricula_folha
      `,
      { siglaLocalidade: this.siglaLocalidade },
    );

    return rows.map((row) => ({
      matricula: String(row.matricula ?? ""),
      lotacaoId: this.toNumberOrNull(row.lotacaoId),
      cargoId: this.toNumberOrNull(row.cargoId),
      lotacao: this.toLotacaoDto({
        id: row.lotacaoId,
        idPai: row.lotacaoIdPai,
        descricao: row.lotacaoDescricao,
        sigla: row.lotacaoSigla,
        categoria: row.lotacaoSigla,
        dataInicio: row.lotacaoDataInicio,
        dataFim: row.lotacaoDataFim,
        email: row.lotacaoEmail,
        tipoId: row.tipoId,
        tipoNome: row.tipoNome,
      }),
      cargo: row.cargoId
        ? {
            id: this.toNumberOrNull(row.cargoId) ?? 0,
            cargoDescricao: String(row.cargoDescricao ?? ""),
          }
        : null,
    }));
  }

  async buscarTiposAfastamento(): Promise<SarhTipoAfastamentoDto[]> {
    const rows = await this.query<OracleRow>(`
      select
        tiaf_cod_tipo_afas as "codigo",
        tiaf_dsc_tipo_afas as "descricao",
        case tiaf_tipo
          when '1' then 'LICENCA'
          when '2' then 'AUSENCIA_FOLGA'
          when '3' then 'AFASTAMENTO'
          else 'OUTRO'
        end as "categoria",
        tiaf_remunerada as "remunerada",
        tiaf_flag_servidor as "servidor",
        tiaf_flag_juiz as "juiz",
        to_char(tiaf_dat_inicio_vigencia, 'YYYY-MM-DD') as "dataInicioVigencia",
        to_char(tiaf_dat_fim_vigencia, 'YYYY-MM-DD') as "dataFimVigencia"
      from sarh.rh_tipo_afastamento
      order by tiaf_cod_tipo_afas
    `);

    return rows.map((row) => ({
      codigo: this.toNumberOrNull(row.codigo) ?? 0,
      descricao: String(row.descricao ?? ""),
      categoria: String(row.categoria ?? "OUTRO"),
      remunerada: this.toStringOrNull(row.remunerada),
      servidor: this.toStringOrNull(row.servidor),
      juiz: this.toStringOrNull(row.juiz),
      dataInicioVigencia: this.toStringOrNull(row.dataInicioVigencia),
      dataFimVigencia: this.toStringOrNull(row.dataFimVigencia),
    }));
  }

  async buscarAfastamentos(): Promise<SarhAfastamentoDto[]> {
    const rows = await this.query<OracleRow>(
      `
      with filtros as (
        select :siglaLocalidade as sigla_localidade from dual
      ),
      servidor_base as (
        select
          f.func_sesb_sigla_secao_subsecao as sigla,
          f.func_cod_funcionario as cod_funcionario,
          f.func_matricula_folha as matricula,
          f.func_pess_c_p_f as cpf,
          s.no_servidor as nome
        from sarh.rh_funcionario f
        left join sarh.serv_pessoal s
          on s.nu_matr_servidor = f.func_matricula_folha
        cross join filtros flt
        where upper(f.func_matricula_folha) like upper(flt.sigla_localidade) || '%'
          and s.flag_ativo = 1
          and ${this.filtroMatriculaPessoaPontoSarh("f.func_matricula_folha")}
      ),
      eventos as (
        select
          'LICENCA:' || l.lice_func_sigla_secao_subsecao || ':' || l.lice_func_cod_funcionario || ':' ||
            l.lice_cod_licenca || ':' || p.plic_cod_perio_licen as id,
          case t.tiaf_tipo
            when '1' then 'LICENCA'
            when '2' then 'AUSENCIA_FOLGA'
            when '3' then 'AFASTAMENTO'
            else 'OUTRO'
          end as categoria,
          to_char(t.tiaf_cod_tipo_afas) as tipo_codigo,
          t.tiaf_dsc_tipo_afas as tipo_descricao,
          sb.matricula,
          sb.cpf,
          sb.nome,
          p.plic_inicio_periodo as data_inicio_ordem,
          to_char(p.plic_inicio_periodo, 'YYYY-MM-DD') as data_inicio,
          to_char(p.plic_fim_periodo, 'YYYY-MM-DD') as data_fim,
          case
            when p.plic_fim_periodo is not null then trunc(p.plic_fim_periodo) - trunc(p.plic_inicio_periodo) + 1
            else null
          end as dias,
          null as exercicio,
          coalesce(l.lice_num_processo, to_char(p.plic_num_sei)) as processo,
          l.lice_observacao as observacao,
          'RH_LICENCA/RH_PERIODO_LICENCA' as origem_tabela
        from sarh.rh_licenca l
        join sarh.rh_periodo_licenca p
          on p.plic_lice_secao_subsecao = l.lice_func_sigla_secao_subsecao
         and p.plic_lice_cod_funcionario = l.lice_func_cod_funcionario
         and p.plic_lice_cod_licenca = l.lice_cod_licenca
        join sarh.rh_tipo_afastamento t
          on t.tiaf_cod_tipo_afas = l.lice_tiaf_cod_tipo_afas
        join servidor_base sb
          on sb.sigla = l.lice_func_sigla_secao_subsecao
         and sb.cod_funcionario = l.lice_func_cod_funcionario

        union all

        select
          'FERIAS:' || f.feri_func_sigla_secao_subsecao || ':' || f.feri_func_cod_funcionario || ':' ||
            f.feri_exercicio || ':' || p.pfer_cod_peri_feri as id,
          'FERIAS' as categoria,
          p.pfer_flag_ocorrencia as tipo_codigo,
          'FERIAS' as tipo_descricao,
          sb.matricula,
          sb.cpf,
          sb.nome,
          p.pfer_inicio_periodo as data_inicio_ordem,
          to_char(p.pfer_inicio_periodo, 'YYYY-MM-DD') as data_inicio,
          to_char(p.pfer_fim_periodo, 'YYYY-MM-DD') as data_fim,
          p.pfer_dias_gozados as dias,
          f.feri_exercicio as exercicio,
          to_char(p.pfer_num_processo_sei) as processo,
          coalesce(p.pfer_motivo_alteracao, f.feri_observacao) as observacao,
          'RH_FERIAS/RH_PERIODO_FERIAS' as origem_tabela
        from sarh.rh_ferias f
        join sarh.rh_periodo_ferias p
          on p.pfer_feri_sigla_secao_subsecao = f.feri_func_sigla_secao_subsecao
         and p.pfer_feri_cod_funcionario = f.feri_func_cod_funcionario
         and p.pfer_feri_exercicio = f.feri_exercicio
        join servidor_base sb
          on sb.sigla = f.feri_func_sigla_secao_subsecao
         and sb.cod_funcionario = f.feri_func_cod_funcionario

        union all

        select
          'AFASTAMENTO:' || a.afas_avts_sigla_secao_subsecao || ':' || a.afas_avts_func_cod_funcionario || ':' ||
            a.afas_avts_cod_averb_temp_serv || ':' || a.afas_cod_afastamento as id,
          'AFASTAMENTO' as categoria,
          to_char(t.tiaf_cod_tipo_afas) as tipo_codigo,
          t.tiaf_dsc_tipo_afas as tipo_descricao,
          sb.matricula,
          sb.cpf,
          sb.nome,
          a.afas_dat_inic_afastamento as data_inicio_ordem,
          to_char(a.afas_dat_inic_afastamento, 'YYYY-MM-DD') as data_inicio,
          to_char(a.afas_dat_fim_afastamento, 'YYYY-MM-DD') as data_fim,
          a.afas_num_dias as dias,
          a.afas_ano as exercicio,
          cast(null as varchar2(4000)) as processo,
          a.afas_fundamento_legal as observacao,
          'RH_AFASTAMENTO' as origem_tabela
        from sarh.rh_afastamento a
        left join sarh.rh_tipo_afastamento t
          on t.tiaf_cod_tipo_afas = a.afas_tiaf_cod_tipo_afas
        join servidor_base sb
          on sb.sigla = a.afas_avts_sigla_secao_subsecao
         and sb.cod_funcionario = a.afas_avts_func_cod_funcionario

        union all

        select
          'AFASTAMENTO_DIVERSO:' || d.afad_func_sigla_funcionario || ':' || d.afad_func_cod_funcionario || ':' ||
            d.afad_cod_afastamento as id,
          'AFASTAMENTO_DIVERSO' as categoria,
          cast(null as varchar2(4000)) as tipo_codigo,
          d.afad_desc_tipo_afastamento as tipo_descricao,
          sb.matricula,
          sb.cpf,
          sb.nome,
          d.afad_dat_inicio_afast as data_inicio_ordem,
          to_char(d.afad_dat_inicio_afast, 'YYYY-MM-DD') as data_inicio,
          to_char(d.afad_dat_fim_afast, 'YYYY-MM-DD') as data_fim,
          case
            when d.afad_dat_fim_afast is not null then trunc(d.afad_dat_fim_afast) - trunc(d.afad_dat_inicio_afast) + 1
            else null
          end as dias,
          null as exercicio,
          d.afad_desc_documento as processo,
          d.afad_observacoes as observacao,
          'RH_AFASTAMENTOS_DIVERSOS' as origem_tabela
        from sarh.rh_afastamentos_diversos d
        join servidor_base sb
          on sb.sigla = d.afad_func_sigla_funcionario
         and sb.cod_funcionario = d.afad_func_cod_funcionario
      )
      select
        id as "id",
        categoria as "categoria",
        tipo_codigo as "tipoCodigo",
        tipo_descricao as "tipoDescricao",
        matricula as "matricula",
        cpf as "cpf",
        nome as "nome",
        data_inicio as "dataInicio",
        data_fim as "dataFim",
        dias as "dias",
        exercicio as "exercicio",
        processo as "processo",
        observacao as "observacao",
        origem_tabela as "origemTabela"
      from eventos
      order by data_inicio_ordem desc nulls last, categoria, matricula
      `,
      { siglaLocalidade: this.siglaLocalidade },
    );

    return rows.map((row) => ({
      id: String(row.id ?? ""),
      categoria: String(row.categoria ?? "OUTRO"),
      tipoCodigo: this.toStringOrNull(row.tipoCodigo),
      tipoDescricao: this.toStringOrNull(row.tipoDescricao),
      matricula: this.toStringOrNull(row.matricula),
      cpf: this.toCpf(row.cpf),
      nome: this.toStringOrNull(row.nome),
      dataInicio: this.toStringOrNull(row.dataInicio),
      dataFim: this.toStringOrNull(row.dataFim),
      dias: this.toNumberOrNull(row.dias),
      exercicio: this.toNumberOrNull(row.exercicio),
      processo: this.toStringOrNull(row.processo),
      observacao: this.toStringOrNull(row.observacao),
      origemTabela: String(row.origemTabela ?? "SARH"),
    }));
  }

  async buscarChefias(): Promise<SarhChefiaDto[]> {
    const rows = await this.query<OracleRow>(
      `
      select
        ifun.ifun_cod_id_funcao as "idFuncaoLotacao",
        l.lota_cod_lotacao as "lotacaoId",
        l.lota_sigla_lotacao as "lotacaoSigla",
        l.lota_dsc_lotacao as "lotacaoDescricao",
        f.nfun_dsc_funcao as "funcaoDescricao",
        hifc.hifc_fcon_categ_func_conf as "funcaoCategoria",
        hifc.hifc_fcon_cod_func_conf as "funcaoCodigo",
        mf.mvfu_matricula_folha as "matricula",
        s.no_servidor as "nome",
        sitf.sitf_dsc_sit_func_conf as "situacao",
        to_char(mf.mvfu_dat_inic_exerc, 'YYYY-MM-DD') as "dataInicio",
        ifun.ifun_flag_ocupado as "flagOcupado",
        ifun.ifun_flag_ativa as "flagAtiva"
      from sarh.rh_identificacao_funcao ifun
      join sarh.rh_lotacao l
        on l.lota_cod_lotacao = ifun.ifun_lota_cod_lotacao
      left join sarh.rh_funcao f
        on f.nfun_cod_nome_funcao = ifun.ifun_nfun_cod_nome_funcao
      left join sarh.rh_hist_funcao_confianca hifc
        on hifc.hifc_ifun_cod_id_funcao = ifun.ifun_cod_id_funcao
       and (hifc.hifc_dat_fim is null or hifc.hifc_dat_fim >= trunc(sysdate))
      left join sarh.rh_movimentacao_funcional mf
        on mf.mvfu_hifc_ifun_cod_id_funcao = ifun.ifun_cod_id_funcao
       and (mf.mvfu_dat_fim_exerc is null or mf.mvfu_dat_fim_exerc >= trunc(sysdate))
       and (mf.mvfu_dat_fim_mov is null or mf.mvfu_dat_fim_mov >= trunc(sysdate))
      left join sarh.serv_pessoal s
        on s.nu_matr_servidor = mf.mvfu_matricula_folha
      left join sarh.rh_situacao_funcao_confianca sitf
        on sitf.sitf_cod_sit_func_conf = mf.mvfu_sitf_cod_sit_func_conf
      where (mf.mvfu_matricula_folha is null or s.flag_ativo = 1)
        and (
          upper(mf.mvfu_matricula_folha) like upper(:siglaLocalidade) || '%'
          and ${this.filtroMatriculaPessoaPontoSarh("mf.mvfu_matricula_folha")}
         or exists (
           select 1
           from sarh.rh_cargo_funcionario cf
           join sarh.serv_pessoal s_cf
             on s_cf.nu_matr_servidor = cf.cafu_matricula_folha
            and s_cf.flag_ativo = 1
           where cf.cafu_cod_lotacao = l.lota_cod_lotacao
             and upper(cf.cafu_matricula_folha) like upper(:siglaLocalidade) || '%'
             and ${this.filtroMatriculaPessoaPontoSarh("cf.cafu_matricula_folha")}
         )
         or exists (
           select 1
           from sarh.rh_movimentacao_funcional mf_lot
           join sarh.serv_pessoal s_mf_lot
             on s_mf_lot.nu_matr_servidor = mf_lot.mvfu_matricula_folha
            and s_mf_lot.flag_ativo = 1
           where upper(mf_lot.mvfu_func_sigla_secao_exerce) = upper(l.lota_sigla_lotacao)
             and upper(mf_lot.mvfu_func_sigla_secao_exerce) like upper(:siglaLocalidade) || '%'
             and upper(mf_lot.mvfu_matricula_folha) like upper(:siglaLocalidade) || '%'
             and ${this.filtroMatriculaPessoaPontoSarh("mf_lot.mvfu_matricula_folha")}
         )
        )
      order by l.lota_sigla_lotacao, hifc.hifc_fcon_categ_func_conf desc, f.nfun_dsc_funcao
      `,
      { siglaLocalidade: this.siglaLocalidade },
    );

    return rows
      .filter(
        (row) =>
          this.toNumberOrNull(row.idFuncaoLotacao) !== null &&
          this.toNumberOrNull(row.lotacaoId) !== null,
      )
      .map((row) => ({
        idFuncaoLotacao: this.toNumberOrNull(row.idFuncaoLotacao) ?? 0,
        lotacaoId: this.toNumberOrNull(row.lotacaoId) ?? 0,
        lotacaoSigla: this.toStringOrNull(row.lotacaoSigla),
        lotacaoDescricao: this.toStringOrNull(row.lotacaoDescricao),
        funcaoDescricao: this.toStringOrNull(row.funcaoDescricao),
        funcaoCategoria: this.toStringOrNull(row.funcaoCategoria),
        funcaoCodigo: this.toStringOrNull(row.funcaoCodigo),
        matricula: this.toStringOrNull(row.matricula),
        nome: this.toStringOrNull(row.nome),
        situacao: this.toStringOrNull(row.situacao),
        dataInicio: this.toStringOrNull(row.dataInicio),
        flagOcupado: this.toStringOrNull(row.flagOcupado),
        flagAtiva: this.toStringOrNull(row.flagAtiva),
      }));
  }

  async buscarCalendarios(): Promise<SarhCalendarioDto[]> {
    const rows = await this.query<OracleRow>(`
      select
        f.feri_num_id_pk as "id",
        to_char(f.feri_dt_data, 'YYYY-MM-DD') as "data",
        f.feri_dsc_motivo as "descricao",
        f.feri_num_abrangencia as "abrangencia",
        f.sesu_cd_secsubsec_fk as "secaoSubsecaoId",
        f.feri_cod_uf as "uf",
        f.feri_cod_ativo as "ativo",
        f.var_cd_vara as "varaId"
      from sarh.ps_apoio_feriado f
      where f.feri_dt_data is not null
      order by f.feri_dt_data, f.feri_num_id_pk
    `);

    return rows
      .map((row): SarhCalendarioDto | null => {
        const data = this.toStringOrNull(row.data);
        const descricao = String(row.descricao ?? "").trim();

        if (!data || !descricao) {
          return null;
        }

        return {
          id: `PS_APOIO_FERIADO:${row.id}`,
          data,
          descricao,
          tipo: this.mapearTipoCalendarioSarh(descricao),
          abrangencia: this.mapearAbrangenciaCalendarioSarh(
            this.toNumberOrNull(row.abrangencia),
            this.toStringOrNull(row.uf),
            this.toNumberOrNull(row.secaoSubsecaoId),
            this.toNumberOrNull(row.varaId),
          ),
          uf: this.toStringOrNull(row.uf),
          secaoSubsecaoId: this.toNumberOrNull(row.secaoSubsecaoId),
          varaId: this.toNumberOrNull(row.varaId),
          ativo: this.toBoolean(row.ativo),
          origemTabela: "PS_APOIO_FERIADO",
          metadados: {
            abrangenciaSarh: this.toNumberOrNull(row.abrangencia),
            secaoSubsecaoId: this.toNumberOrNull(row.secaoSubsecaoId),
            varaId: this.toNumberOrNull(row.varaId),
          },
        };
      })
      .filter((item): item is SarhCalendarioDto => Boolean(item));
  }

  async buscarFotoServidor(cpf: string): Promise<Buffer | null> {
    const cpfNormalizado = this.toCpf(cpf);

    if (!cpfNormalizado) {
      return null;
    }

    const oracledb = await this.loadOracleDb();
    let connection: Connection | null = null;

    try {
      connection = await oracledb.getConnection({
        user: this.username,
        password: this.password,
        connectString: this.connectString,
      });

      const result = await connection.execute<OracleRow>(
        `
        select foto_foto as "foto"
        from sarh.rh_foto
        where lpad(to_char(foto_pess_c_p_f), 11, '0') = :cpf
        fetch first 1 rows only
        `,
        { cpf: cpfNormalizado },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            foto: { type: oracledb.BUFFER },
          },
        },
      );
      const foto = result.rows?.[0]?.foto;

      if (Buffer.isBuffer(foto)) {
        return foto;
      }

      if (foto instanceof Uint8Array) {
        return Buffer.from(foto);
      }

      if (isReadableBlob(foto)) {
        return bufferFromReadableBlob(foto);
      }

      return null;
    } finally {
      await connection?.close();
    }
  }

  async buscarTudo(): Promise<SarhPayloadCompleto> {
    const [
      empresas,
      lotacoes,
      cargos,
      servidores,
      lotacoesServidores,
      tiposAfastamento,
      afastamentos,
      chefias,
      calendarios,
    ] = await Promise.all([
      this.buscarEmpresas(),
      this.buscarLotacoes(),
      this.buscarCargos(),
      this.buscarServidores(),
      this.buscarLotacoesServidores(),
      this.buscarTiposAfastamento(),
      this.buscarAfastamentos(),
      this.buscarChefias(),
      this.buscarCalendarios(),
    ]);

    return {
      empresas,
      lotacoes,
      cargos,
      servidores,
      lotacoesServidores,
      tiposAfastamento,
      afastamentos,
      chefias,
      calendarios,
    };
  }

  async testarConexao(): Promise<void> {
    await this.query("select 1 as \"ok\" from dual");
  }

  private async buscarLotacoesPorWhere(where: string) {
    const rows = await this.query<OracleRow>(`
      select
        l.lota_cod_lotacao as "id",
        l.lota_lota_cod_lotacao_pai as "idPai",
        l.lota_dsc_lotacao as "descricao",
        l.lota_sigla_lotacao as "sigla",
        l.lota_sigla_lotacao as "categoria",
        l.lota_dat_inicio as "dataInicio",
        l.lota_dat_fim as "dataFim",
        l.lota_e_mail as "email",
        t.tlot_tipo_lotacao as "tipoId",
        t.tlot_desc_tipo_lotacao as "tipoNome"
      from sarh.rh_lotacao l
      left join sarh.rh_tipo_lotacao t
        on t.tlot_tipo_lotacao = l.lota_tipo_lotacao
      where ${where}
      order by l.lota_cod_lotacao
    `);

    return rows.map((row) => this.toLotacaoDto(row)).filter(Boolean);
  }

  private async query<T>(
    sql: string,
    binds: Record<string, string | number | null> = {},
  ): Promise<T[]> {
    const oracledb = await this.loadOracleDb();
    let connection: Connection | null = null;

    try {
      connection = await oracledb.getConnection({
        user: this.username,
        password: this.password,
        connectString: this.connectString,
      });

      const result = await connection.execute<T>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return result.rows ?? [];
    } finally {
      await connection?.close();
    }
  }

  private filtroMatriculaPessoaPontoSarh(coluna: string) {
    return FILTRO_MATRICULA_PESSOA_PONTO_SARH.replaceAll("{coluna}", coluna);
  }

  private async loadOracleDb() {
    if (!this.username || !this.password || !this.connectString) {
      throw new Error(
        "Configuração Oracle do SARH incompleta. Informe SARH_DB_USERNAME, SARH_DB_PASSWORD e SARH_DB_TNS_ALIAS.",
      );
    }

    const imported = (await import("oracledb")) as OracleDbImport;
    const oracledb = imported.default ?? imported;

    if (!oracleClientInicializado && this.oracleHome) {
      oracledb.initOracleClient({ libDir: this.oracleHome });
      oracleClientInicializado = true;
    }

    return oracledb;
  }

  private toLotacaoDto(row: OracleRow): SarhLotacaoDto {
    const tipo = this.toTipoDto(row.tipoId, row.tipoNome);

    return {
      id: this.toNumberOrNull(row.id) ?? 0,
      idPai: this.toNumberOrNull(row.idPai),
      descricao: String(row.descricao ?? ""),
      sigla: this.toStringOrNull(row.sigla),
      categoria: this.toStringOrNull(row.categoria),
      dataInicio: this.toDateString(row.dataInicio),
      dataFim: this.toDateString(row.dataFim),
      email: this.toStringOrNull(row.email),
      tipo,
    };
  }

  private toTipoDto(id: unknown, nome: unknown): SarhTipoDto | null {
    const tipoId = this.toNumberOrNull(id);

    if (!tipoId) {
      return null;
    }

    return {
      id: tipoId,
      nome: String(nome ?? ""),
    };
  }

  private toNumberOrNull(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private toStringOrNull(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    return text ? text : null;
  }

  private toCpf(value: unknown) {
    const text = this.toStringOrNull(value)?.replace(/\D/g, "") ?? null;
    return text ? text.padStart(11, "0").slice(-11) : null;
  }

  private toDateString(value: unknown) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? null
      : date.toISOString().slice(0, 10);
  }

  private toBoolean(value: unknown) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    const normalized = String(value ?? "")
      .trim()
      .toUpperCase();
    return ["1", "S", "SIM", "TRUE", "ATIVO"].includes(normalized);
  }

  private mapearTipoCalendarioSarh(
    descricao: string,
  ): SarhCalendarioDto["tipo"] {
    const texto = descricao
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();

    if (texto.includes("PONTO FACULTATIVO")) {
      return "PONTO_FACULTATIVO";
    }

    if (texto.includes("RECESSO") || texto.includes("SUSPENSAO")) {
      return "SUSPENSAO_EXPEDIENTE";
    }

    return "FERIADO";
  }

  private mapearAbrangenciaCalendarioSarh(
    abrangencia: number | null,
    uf: string | null,
    secaoSubsecaoId: number | null,
    varaId: number | null,
  ): SarhCalendarioDto["abrangencia"] {
    if (varaId) return "UNIDADE";
    if (secaoSubsecaoId) return "ORGAO";
    if (uf) return "ESTADUAL";
    if (abrangencia === 2) return "ORGAO";
    return "NACIONAL";
  }
}
