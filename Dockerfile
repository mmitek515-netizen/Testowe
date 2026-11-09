FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
# Codespaces can see transient npm registry failures; retry and expose the *real*
# install error in the Docker build output rather than only 'exit code: 1'.
ENV npm_config_fetch_retries=4 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=60000
RUN npm install --no-audit --no-fund --loglevel=warn || { \
    echo "=== npm install failed; most recent npm debug log ==="; \
    log="$(find /root/.npm/_logs -name '*-debug-0.log' -type f | sort | tail -n 1)"; \
    if [ -n "$log" ]; then tail -n 100 "$log"; else echo "No npm debug log found"; fi; \
    exit 1; \
}
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# tsx runs the Express backend, which serves the already-built Vite frontend in production.
CMD ["npm", "run", "dev"]
