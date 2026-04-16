FROM node:18

WORKDIR /app

COPY . .

RUN npm install

RUN npx prisma generate

CMD ["node", "src/server.js"]
