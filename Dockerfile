FROM node:alpine

ENV APP_HOME=/usr/src/app

# Create app directory
WORKDIR $APP_HOME

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json $APP_HOME/
RUN npm install

# Bundle app source
COPY . .
EXPOSE 9229
CMD [ "node", "index.js" ]
