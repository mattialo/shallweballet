FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN bun run build

# --- runtime stage ---
FROM oven/bun:1

WORKDIR /app

COPY --from=builder /app/build/client ./build/client
COPY docker-serve.ts ./

EXPOSE 8080

CMD ["bun", "docker-serve.ts"]
