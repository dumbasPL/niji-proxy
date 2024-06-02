FROM node:lts-alpine

WORKDIR /app

COPY ./ ./

RUN npm ci 

USER node

CMD ["node", "index.js"]
