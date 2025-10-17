FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit

COPY . .

RUN chown -R node:node /app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
