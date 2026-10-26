import net from "node:net";
import aedes from "aedes";

export interface EmbeddedBroker {
  url: string;
  port: number;
  close(): Promise<void>;
}

/** Broker MQTT embutido (Aedes). Porta 0 = o sistema escolhe uma livre (testes). */
export async function startEmbeddedBroker(opts: { host?: string; port?: number } = {}): Promise<EmbeddedBroker> {
  const broker = (aedes as unknown as () => { handle: any; close: (cb: () => void) => void })();
  const server = net.createServer(broker.handle);
  const host = opts.host ?? "0.0.0.0";
  const port = opts.port ?? 1883;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  return {
    url: `mqtt://127.0.0.1:${actualPort}`,
    port: actualPort,
    async close() {
      await new Promise<void>((r) => broker.close(() => r()));
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    },
  };
}
