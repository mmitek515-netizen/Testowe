FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# tsx runs the Express backend, which serves the already-built Vite frontend in production.
CMD ["npm", "run", "dev"]
