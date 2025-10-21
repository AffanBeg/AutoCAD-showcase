FROM node:20-bullseye
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
CMD ["node", "dist/server.js"]
