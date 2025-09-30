FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install ts-node --save-dev

COPY . .

ENV NODE_ENV=production

CMD ["npx", "ts-node", "deploy-with-incremental-updates.ts"]