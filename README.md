# niji-proxy

Proxy slitter server. Save data by only proxying the the domains that matter.

## Use case

You have a high quality proxy with limited bandwidth.
The program using the proxy will try to proxy everything through it 
(images, scripts, cdn content, etc) but these requests don't actually 
need to be proxied since almost no CDN is doing any ip filtering.
By using this project you can save bandwidth by only proxying the domains that matter
(APIs, auth, etc).

## Limitations

- Only supports HTTP/HTTPS proxies
- Only filtering by domain (no path filtering, most trafic is encrypted anyway)

## Usage

### Configuration

Configuration is done through environment variables. (.env file is supported)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| LISTEN_HOST | Host to listen on | `0.0.0.0` | NO |
| LISTEN_PORT | Port to listen on | `8080` | NO |
| GOOD_HOST_REGEX | Regex to match good hosts | - | YES |
| GOOD_PROXY | Proxy to use for good hosts (matched by regex) | - | YES |
| BAD_PROXY | Proxy to use for bad hosts (not matched by regex) | - | NO |
| DEBUG | Enable debug logging | `false` | NO |

#### NOTES

> [!CAUTION]
> This proxy has not authentication of its own, 
> do not expose it to the internet if you don't want to become an open proxy!
> It's designed to be used locally (localhost, docker network, etc)

- if `GOOD_PROXY` has credentials, it will always use them and ignore the credentials from the client
- if `GOOD_PROXY` has no credentials, it will passthrough the credentials from the client
- if `BAD_PROXY` has no credentials, no authentication will be used (passthrough not supported to avoid leaking credentials)
- if `BAD_PROXY` is missing, "bad" connections will be made directly to the target host (no proxy)
- `DEBUG` will expose credentials in the logs, use with caution

#### Example

```env
LISTEN_HOST=127.0.0.1
LISTEN_PORT=8080
GOOD_HOST_REGEX=^api\.
GOOD_PROXY=http://user:pass@good-proxy-server:8080
BAD_PROXY=http://bad-proxy-server:8080
```

### Running

```bash
git clone https://github.com/dumbasPL/niji-proxy.git
cd niji-proxy
# Create .env file with the configuration

# Using docker
docker compose up

# Using node
npm install
npm start
```

## License

[MIT](./LICENSE)
