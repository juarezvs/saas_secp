/* eslint-disable @typescript-eslint/no-require-imports */
const net = require("node:net");

const listenPort = Number(process.env.SECP_ORACLE_RELAY_PORT ?? 11521);
const targetHost = process.env.SECP_ORACLE_RELAY_HOST ?? "172.19.3.3";
const targetPort = Number(process.env.SECP_ORACLE_RELAY_TARGET_PORT ?? 1521);

const server = net.createServer((client) => {
  const target = net.createConnection(
    { host: targetHost, port: targetPort },
    () => {
      client.pipe(target);
      target.pipe(client);
    },
  );

  const closeBoth = () => {
    client.destroy();
    target.destroy();
  };

  client.on("error", closeBoth);
  target.on("error", closeBoth);
  client.on("close", closeBoth);
  target.on("close", closeBoth);
});

server.listen(listenPort, "0.0.0.0", () => {
  console.log(
    `Oracle relay listening on 0.0.0.0:${listenPort} -> ${targetHost}:${targetPort}`,
  );
});
