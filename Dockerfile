FROM node:18

WORKDIR /app

COPY . /app

RUN npm install

RUN npm run build

#RUN rm -rf ./src

EXPOSE 3333

# run todosimple
CMD ["npm", "run", "production"]