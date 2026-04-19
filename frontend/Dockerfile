FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .

RUN chown -R node:node /app

EXPOSE 5173

CMD ["yarn", "dev", "--host"]