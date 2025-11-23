FROM node:18-alpine

# Install ffmpeg for audio conversion
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]

