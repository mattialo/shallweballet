import { NodeSDK } from "@opentelemetry/sdk-node"
import { trace } from "@opentelemetry/api"
import { logs } from "@opentelemetry/api-logs"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"

const serviceName = process.env.OTEL_SERVICE_NAME ?? "pi-demo-backend"
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"

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
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
})

sdk.start()

process.on("SIGTERM", () => sdk.shutdown())
process.on("SIGINT", () => sdk.shutdown())

export const logger = logs.getLogger(serviceName)
export const tracer = trace.getTracer(serviceName)
