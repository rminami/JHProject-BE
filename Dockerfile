FROM node:latest

# Application directory
WORKDIR /usr/src/app

# Install dependencies with yarn
COPY package*.json ./
RUN yarn install

# Bundle app source
COPY . .

# Expose port for development
EXPOSE 5000

# Start application
CMD [ "yarn", "dev" ]
