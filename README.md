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
- `DYNSDJS_DOCKER_TEMPLATE_IN` will tell to the template engine which files to use as input ( see [Templating](#Templating) )
- `DYNSDJS_DOCKER_TEMPLATE_OUT` will tell to the template engine where to save the generated file ( see [Templating](#Templating) )
- `DYNSDJS_DOCKER_TEMPLATE_CALLBACK` provide a fully custom entrypoint that will be run through [child_process.exec](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) ( see [Templating](#Templating) )

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

## Templating

This plugin provides a full support for template generation using [Twig.js](https://github.com/twigjs/twig.js/wiki) with the container context informations, such as IPv4, IPv6, Name, Environments Variables, Labels and attached Domains.

May be extremely useful if you would like to attach this plugin to an Nginx HTTP service for example, where you may want to generate custom `server` entries, depending on the container that is coming in.

In order to configure the template engine, at least these two environment variables must be defined:

- `DYNSDJS_DOCKER_TEMPLATE_IN`: a full path to a Twig file ( either relative to the process or absolute )
- `DYNSDJS_DOCKER_TEMPLATE_OUT`: a full path to where you want to save your file. The value is templatable, see below.

On top of the template files, the template engine can call you back through a third environemnt variable:

- `DYNSDJS_DOCKER_TEMPLATE_CALLBACK`: a shell command that will be executed once the template is generated, through [child_process.exec](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback). The value is templatable, see below.

The process will be **non blocking**, which means that the DNS server has no clue about this generation, although if any error occours it will be given in the same logging behavior like the core DNS server is doing.

> **WARNING:** The path defined in `DYNSDJS_DOCKER_TEMPLATE_OUT`, will be removed when the container will be stopped.

### Templatable values

Some environment variables accept some template strings, that will be replaced during runtime. The list of available template strings are:

- `$CONTAINER_NAME`: the container name ( given through `--name` on `docker run` )
- `$CONTAINER_DOMAIN`: the container attached domain(s) ( given through `--name` on `docker run` or `-e VIRTUAL_HOST=` ).
  **WARNING:** this may contain comma-separated values.

### Twig file context

The twig template file will always contain an object named `container` where inside you will find those values:

- `A`: the IPv4 of the container
- `AAAA`: the IPv6 of the container
- `name`: the name of the container ( given through `--name` on `docker run` )
- `envs`: an array of given environment variables ( through `-e` flag on `docker run` )
- `labels`: an object of given labels ( through `-l` flag on `docker run` )
- `domain`: the attached domains to the container; may be a CSV ( given through `--name` on `docker run` or `-e VIRTUAL_HOST=` ) or a single domain value

## Example

### Without templating

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
### With templating

Dynsd side:

```shell
$ DYNSDJS_DOCKER_TEMPLATE_IN="/your/path/here/template_file.twig" DYNSDJS_DOCKER_TEMPLATE_OUT="/your/path/here/\$CONTAINER_NAME.twig" DYNSDJS_DOCKER_TEMPLATE_CALLBACK="touch /your/path/here/touch.callback" dynsd
[21:26:32] INFO: [CORE] Loading plugin 'dynsdjs-plugin-docker'...
[21:26:32] INFO: [CORE] Dispatching 'init' event. Waiting for plugins to complete...
[21:26:32] INFO: [DOCKER] Connected to Docker API...
[21:26:32] INFO: [DNS] Listening on [::]:53/tcp
[21:26:32] INFO: [DNS] Listening on 0.0.0.0:53/udp
[21:26:32] INFO: [DNS] Listening on [::]:53/udp
[21:26:35] INFO: [DOCKER] Added container with domain 'nginx.test'...
[21:26:35] INFO: [DOCKER] Post generation callback succesfully completed.
[21:26:40] INFO: [DOCKER] Removed container with domain 'nginx.test'...
[21:26:40] INFO: [DOCKER] Post generation callback succesfully completed.
```

Docker side:

```shell
$ docker run -d --rm --name nginx.test nginx:alpine
# ...
$ docker stop nginx.test
```

`/your/path/here` tree:

```shell
$ cd /your/path/here
$ tree
.
├── template_file.twig
└── touch.callback
```

`template_file.twig` content example:

```twig
{{ dump( container ) }}
```

