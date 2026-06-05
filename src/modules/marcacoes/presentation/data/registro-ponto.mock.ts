export type EstadoRegistroPonto =
  | "primeira-marcacao"
  | "segunda-marcacao"
  | "terceira-marcacao"
  | "quarta-marcacao"
  | "registrado";

export type MarcacaoMock = {
  rotulo: string;
  horario: string;
  metodo: "Biometria facial" | "Registro web";
};

export const registroPontoMock = {
  servidor: {
    nome: "Juarez Silva",
    matricula: "AM12345",
    unidade: "SJAM > SECAD > NUTEC",
    jornada: "7h00",
  },
  dataReferencia: "Segunda-feira, 01 de junho de 2026",
  horaAtual: "08:02",
  marcacoesPorEstado: {
    "primeira-marcacao": [],
    "segunda-marcacao": [
      { rotulo: "Entrada", horario: "08:02", metodo: "Biometria facial" },
    ],
    "terceira-marcacao": [
      { rotulo: "Entrada", horario: "08:02", metodo: "Biometria facial" },
      { rotulo: "Saída intervalo", horario: "12:01", metodo: "Registro web" },
    ],
    "quarta-marcacao": [
      { rotulo: "Entrada", horario: "08:02", metodo: "Biometria facial" },
      { rotulo: "Saída intervalo", horario: "12:01", metodo: "Registro web" },
      { rotulo: "Retorno intervalo", horario: "13:01", metodo: "Registro web" },
    ],
    registrado: [
      { rotulo: "Entrada", horario: "08:02", metodo: "Biometria facial" },
      { rotulo: "Saída intervalo", horario: "12:01", metodo: "Registro web" },
      { rotulo: "Retorno intervalo", horario: "13:01", metodo: "Registro web" },
      { rotulo: "Saída", horario: "15:08", metodo: "Registro web" },
    ],
  } satisfies Record<EstadoRegistroPonto, MarcacaoMock[]>,
};

export const fluxoRegistroPonto = [
  {
    estado: "primeira-marcacao",
    label: "Sem marcação",
    proxima: "Entrada",
    exigeBiometria: true,
  },
  {
    estado: "segunda-marcacao",
    label: "Entrada registrada",
    proxima: "Saída intervalo",
    exigeBiometria: false,
  },
  {
    estado: "terceira-marcacao",
    label: "Intervalo iniciado",
    proxima: "Retorno intervalo",
    exigeBiometria: false,
  },
  {
    estado: "quarta-marcacao",
    label: "Intervalo finalizado",
    proxima: "Saída",
    exigeBiometria: false,
  },
  {
    estado: "registrado",
    label: "Comprovante",
    proxima: "Dia completo",
    exigeBiometria: false,
  },
] satisfies Array<{
  estado: EstadoRegistroPonto;
  label: string;
  proxima: string;
  exigeBiometria: boolean;
}>;

export const comprovanteMock = {
  codigo: "SECP-20260601-0802",
  horario: "08:02",
  tipo: "Entrada",
  metodo: "Biometria facial validada",
};

