<div align="center">
<img src="./assets/openstack-js-sdk.png" width="300">
<h1 >
  <span style="color:#E61742">OpenStack</span>-<span style="color:#F0DB4F">JS</span>-<span style="color:#5FB0EF">SDK</span>
</h1>

This project provides a SDK and an API to interact with the OpenStack Restful API. 
</div>


### Usage

```bash
git clone git@github.com:GridexX/openstack-js-sdk.git
cd openstack-js-sdk
npm install
npm start
```

> [!IMPORTANT]
> You need to have a `.env` file with the following variables:
> - `OS_AUTH_URL`

> [!TIP]
> To have a better development experience, you can use the `nodemon` package to automatically restart the server when you make changes to the code. Also, you can pretty print the logs with the `pino-pretty` package.

```bash
npm i -g nodemon pino-pretty
npm run dev:start | pino-pretty
```

### Documentation

All the API documentation is available with swagget at `/api-docs` endpoint.
