FROM node:19-buster

COPY package.json /app/package.json
COPY main.js /app/main.js

RUN cd /app && \
  npm install

RUN mkdir /dest

#ENTRYPOINT ["node", "/app/main.js"]
ENTRYPOINT ["tail", "-f", "/dev/null"]

