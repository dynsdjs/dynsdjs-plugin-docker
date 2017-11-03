import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import Twig from 'twig'

const templateFile = process.env.DYNSDJS_DOCKER_TEMPLATE_IN

let callbackExec = process.env.DYNSDJS_DOCKER_TEMPLATE_CALLBACK || '',
    outPath = process.env.DYNSDJS_DOCKER_TEMPLATE_OUT || '',
    templateData

function templateString( str ) {
  let isvHost = 0

  templateData.envs
    .forEach(
      env => {
        if ( env.indexOf( 'VIRTUAL_HOST' ) !== -1 )
          isvHost = 1
      }
    )

  return str
    .replace( 'CONTAINER_NAME', templateData.name )
    .replace( 'CONTAINER_DOMAIN', templateData.domain )
    .replace( 'CONTAINER_ISVHOST', isvHost )
}

function callback() {
  return new Promise(
    ( resolve, reject ) => {
      if ( callbackExec ) {
        exec(
          callbackExec,
          ( error, stdout, stderr ) => {
            if ( error ) reject( `Post generation callback did not succesfully complete. Error: '${error}'` )
            else resolve( true )
          }
        )
      } else
        resolve()
    }
  )
}

function deleteOutput() {
  return new Promise(
    ( resolve, reject ) => {
      if ( outPath ) {
        if ( fs.existsSync( outPath ) )
          fs.unlink(
            outPath,
            err => {
              if ( err ) reject( err )
              else resolve()
            }
          )
      } else
        resolve()
    }
  )
}

function saveOutput( buffer ) {
  return new Promise(
    ( resolve, reject ) => {
      if ( buffer ) {
        if ( outPath ) {
          fs.writeFile(
            outPath,
            buffer,
            err => {
              if ( err ) reject( err )
              else resolve()
            }
          )
        } else
          reject( 'A template was generated, but no output path was defined. Is this really what you want?' )
      } else
        resolve()
    }
  )
}

function generate() {
  return new Promise(
    ( resolve, reject ) => {
      // Check if the user wants to generate a template
      if ( templateFile ) {
        // If the path is defined, and it exists then proceed with generation
        if ( fs.existsSync( templateFile ) ) {
          // Add custom 'exists' filter, which returns a boolean if the path exists
          Twig
            .extendFilter(
              'exists',
              path => {
                let ret = false;

                if ( path )
                  ret = fs.existsSync( path )

                return ret
              }
            )

          Twig.renderFile(
            templateFile,
            {
              container: templateData
            },
            ( err, out ) => {
              if ( err ) reject( err )
              else resolve( out )
            }
          )
        // otherwise, warn the user about the non existant path
        } else {
          reject( 'Template file path does not exist. Skipping template generation.' )
        }
      // If not, just continue silently
      } else
        resolve()
    }
  )
}

export default class {
  constructor( chalk, status, container ) {
    templateData = container

    outPath = templateString( outPath )
    callbackExec = templateString( callbackExec )

    generate()
      .then( buffer => ( status === 'start' ? saveOutput( buffer ) : Promise.resolve() ) )
      .then( () => ( status === 'stop' ? deleteOutput() : Promise.resolve() ) )
      .then( () => callback() )
      .then(
        callbackDone => {
          if ( callbackDone )
            console.log( `[${chalk.blue('DOCKER')}] Post generation callback succesfully completed.` )
        }
      )
      .catch( error => console.warn( `[${chalk.blue('DOCKER')}] ${error}` ) )
  }
}