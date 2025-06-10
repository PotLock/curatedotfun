# gateway

This is based on this [Railway Template](https://github.com/railwayapp-templates/caddy-reverse-proxy/tree/main).

The main domain (`app.curate.fun`) points to this proxy server, which then handles the following routing:

- `/api/*`: [backend](../api)
- `/*`: [app](../app)
