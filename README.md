# dynsdjs-plugin-docker
Docker plugin for dynsdjs

## Installation

Just install the package via npm by doing

```shell
$ npm install -g dynsdjs-plugin-docker
```

## Options

You can configure this plugin through Environment variables

- `DOCKER_HOST` will tell to the plugin the path to your Docker Host in order to connect to ( see the Docker Daemon [official documentation](https://docs.docker.com/engine/reference/commandline/dockerd/#examples) for more )

## Usage

By default this plugin requires no further configuration.

Just run `dynsdjs` and enjoy.

## Workflow

When the plugin starts, it will connect to your Docker daemon and it will listen for any event that has to do with Container Start or Stop.

As soon as the container is started or stopped, it will use the ID to fetch the full container configuration payload. Once the payload is received, a basic set of informations are collected, such as container Name, Hostname, IP, Environment variables or Labels. Both IPv4 and IPv6 records are supported.

Once this payload is built, the domain will be fetched ( see the relative section down below ) and finally, depending on the status, it will do the following action:

- If Started, the domain will be added with its relative `A` and `AAAA` records,
- If Stopped, the domain will be simply removed

These actions will be done for any Container, as long as `dynsd` will be up and running.

### Domain fetch

The domain fetch from your container will be done in this particular order:

1. First it will try to see if the [jwilder/nginx-proxy](https://github.com/jwilder/nginx-proxy) `VIRTUAL_HOST` environment variable is there, and if yes, it will use that as domain. If not found,
2. It will use the container name

> *INFO:* `VIRTUAL_HOST` may contain comma-separated values. This is fully supported by this plugin. When this happens, all the DNS records will be added for the same container IP.

## Example

Dynsd side:

```shell
$ dynsd
[18:08:10] INFO: [CORE] Loading plugin 'dynsdjs-plugin-docker'...
[18:08:11] INFO: [CORE] Dispatching 'init' event. Waiting for plugins to complete...
[18:08:11] INFO: [DOCKER] Connected to Docker API...
[18:08:11] INFO: [DNS] Listening on [::]:53/tcp
[18:08:11] INFO: [DNS] Listening on 0.0.0.0:53/udp
[18:08:11] INFO: [DNS] Listening on [::]:53/udp
[18:08:19] INFO: [DOCKER] Added container with domain 'nginx.test'...
[18:08:23] INFO: [DOCKER] Removed container with domain 'nginx.test'...
```

Docker side:

```shell
$ docker run -d --rm --name nginx.test nginx:alpine
# ...
$ docker stop nginx.test
```