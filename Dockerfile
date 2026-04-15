FROM node:18

WORKDIR /app

COPY . .

RUN cd backend && npm install

CMD ["node", "backend/src/server.js"]
