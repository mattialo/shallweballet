import { trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";

const serviceName = process.env.OTEL_SERVICE_NAME ?? "pi-demo-backend";
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

// Dynamic imports keep OTel SDK packages out of Bun's static ESM module graph.
// @opentelemetry/sdk-node → @opentelemetry/instrumentation → import-in-the-middle
// causes "Requested module is not instantiated yet" in Bun's ESM linker when
// imported statically.
const { NodeSDK } = await import("@opentelemetry/sdk-node");
const { OTLPTraceExporter } = await import(
  "@opentelemetry/exporter-trace-otlp-http"
);
const { OTLPLogExporter } = await import(
  "@opentelemetry/exporter-logs-otlp-http"
);
const { SimpleLogRecordProcessor } = await import("@opentelemetry/sdk-logs");

const sdk = new NodeSDK({
  serviceName,
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  }),
  logRecordProcessors: [
    new SimpleLogRecordProcessor(
      new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` }),
    ),
  ],
});

sdk.start();

process.on("SIGTERM", () => sdk.shutdown());
process.on("SIGINT", () => sdk.shutdown());

export const logger = logs.getLogger(serviceName);
export const tracer = trace.getTracer(serviceName);
