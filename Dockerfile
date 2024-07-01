FROM node:20 AS app
WORKDIR /app
COPY node_modules  /app/node_modules
COPY out /app/out
ENV OS_CLOUD openstack
ENV OS_CLOUDS_FILE /app/clouds.yaml
EXPOSE 3000
CMD ["node", "/app/out/index.js"]
