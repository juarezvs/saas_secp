function toLatin1Bytes(input: string) {
  return Buffer.from(input, "latin1");
}

export function calcularCrc16KermitHex(input: string) {
  const bytes = toLatin1Bytes(input);
  let crc = 0x0000;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0x8408;
      } else {
        crc >>= 1;
      }
    }
  }

  return (crc & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

export function validarCrc16Kermit(params: {
  linhaSemCrc: string;
  crcInformado: string;
}) {
  const calculado = calcularCrc16KermitHex(params.linhaSemCrc);

  return {
    valido: calculado === params.crcInformado.trim().toUpperCase(),
    calculado,
    informado: params.crcInformado.trim().toUpperCase(),
  };
}
