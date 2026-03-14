# Use official Node.js image
FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]
