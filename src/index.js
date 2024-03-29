import Dockerode from 'dockerode'
import DockerEvents from 'docker-events'
import Punycode from 'punycode/'
import TemplateGenerator from './template'

// We will use this to store a reference to the dynsd chalk instance
let chalk = null

// We will use this to store a reference to the dynsd cache instance
let entries = null

// Inherit configurations through existing environment variables, especially DOCKER_HOST
const docker = new Dockerode()

// Our docker emitter handler to the API
const dockerEmitter = new DockerEvents({
  docker: docker
})

// Build the DNS entry from the container infos
const buildInfo = ( status, name, data ) => {
  const action = ( status === 'stop' ? 'Removed' : 'Added' ),
        container = {
          A: data ? data.NetworkSettings.Networks.bridge.IPAddress : null,
          AAAA: data ? data.NetworkSettings.Networks.bridge.GlobalIPv6Address : null,
          name: name,
          envs: data ? data.Config.Env : null,
          labels: data ? data.Config.Labels : null
        }

  let entry = {}

  // Support jwilder nginx-proxy companion ENV vars
  if ( container.envs )
    container.envs
      .forEach(
        env => {
          if ( env.indexOf( 'VIRTUAL_HOST' ) !== -1 )
            container.domain = Punycode.toASCII( env.split("=")[1] )
        }
      )

  // If we still have no domain set, we use the generated name as fallback
  if ( !container.domain )
    container.domain = Punycode.toASCII( container.name )

  // Handle multiple domains using CSV format
  const domains = container.domain.split( ',' )

  domains
    .forEach(
      domain => {
        // Add or remove the entry from the DNS
        if ( status === 'stop' )
          entries
            .del( domain )
        else {
          // Build the entry
          if ( container.A )
            entry.A = {
              name: domain,
              address: container.A,
              ttl: 600
            }

          if ( container.AAAA )
            entry.AAAA = {
              name: domain,
              address: container.AAAA,
              ttl: 600
            }

          // Add the entry
          entries
            .set(
              domain,
              entry
            )
        }
      }
    )

  console.log( `[${chalk.blue('DOCKER')}] ${action} container with domain${domains.length > 1 ? 's' : ''} '${chalk.green(container.domain)}'...` )

  // Generate template file
  new TemplateGenerator( chalk, status, container )
}

// Fetch detailed container infos
const fetchInfo = container => {
  docker
    .getContainer( container.id || container.Id )
    .inspect(
      ( err, data ) => {
        if ( err )
          container.status = 'stop'

        buildInfo(
          container.status,
          data.Name.slice(1), // Remove the first slash from the name
          data
        )
      }
    )
}

// Get all the already running containers, and add them
const fetchRunningContainers = () => {
  docker
    .listContainers(
      ( err, containers ) => {
        containers.forEach(
          container => fetchInfo( container )
        )
      }
    )
}

// Initialize the Docker API listener
const start = ( resolve, reject, data ) => {
  entries = data.entries

  dockerEmitter
    .on( 'connect', () => {
      console.log( `[${chalk.blue('DOCKER')}] Connected to Docker API...` )

      fetchRunningContainers()

      resolve()
    })
    .on( 'start', data => fetchInfo( data ) )
    .on( 'stop', data => fetchInfo( data ) )
    .on( 'error', reject )
    .start()
}

export default class {
  constructor( dns ) {
    chalk = dns.chalk

    dns
      .on( 'init', ( resolve, reject, data ) => {
        start( resolve, reject, data )
      })
  }
}