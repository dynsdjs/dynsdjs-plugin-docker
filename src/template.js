import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import Twig from 'twig'

export default class {
  constructor( chalk, status, container ) {
    const me = this

    me.templateData = container
    me.templateFile = process.env.DYNSDJS_DOCKER_TEMPLATE_IN
    me.outPath = me.templateString( process.env.DYNSDJS_DOCKER_TEMPLATE_OUT || '' )
    me.callbackExecPre = me.templateString( process.env.DYNSDJS_DOCKER_TEMPLATE_CALLBACK_PRE || '' )
    me.callbackExecPost = me.templateString( process.env.DYNSDJS_DOCKER_TEMPLATE_CALLBACK_POST || '' )

    me
      .callback( 'Pre', me.callbackExecPre )
      .then( () => me.generate() )
      .then( buffer => ( status !== 'stop' ? me.saveOutput( buffer ) : Promise.resolve() ) )
      .then( () => ( status === 'stop' ? me.deleteOutput() : Promise.resolve() ) )
      .then( () => me.callback( 'Post', me.callbackExecPost ) )
      .then(
        callbackDone => {
          if ( callbackDone )
            console.log( `[${chalk.blue('DOCKER')}] Post generation callback succesfully completed.` )
        }
      )
      .catch( error => console.warn( `[${chalk.blue('DOCKER')}] ${error}` ) )
  }
  templateString( str ) {
    const me = this

    let isvHost = 0

    me.templateData.envs
      .forEach(
        env => {
          if ( env.indexOf( 'VIRTUAL_HOST' ) !== -1 )
            isvHost = 1
        }
      )

    return str
      .replace( 'CONTAINER_NAME', me.templateData.name )
      .replace( 'CONTAINER_DOMAIN', me.templateData.domain )
      .replace( 'CONTAINER_ISVHOST', isvHost )
  }
  callback( type, cmd ) {
    const me = this

    return new Promise(
      ( resolve, reject ) => {
        if ( cmd ) {
          exec(
            cmd,
            ( error, stdout, stderr ) => {
              if ( error ) reject( `${type} generation callback did not succesfully complete. Error: '${error}'` )
              else resolve( true )
            }
          )
        } else
          resolve()
      }
    )
  }
  deleteOutput() {
    const me = this

    return new Promise(
      ( resolve, reject ) => {
        if ( me.outPath ) {
          if ( fs.existsSync( me.outPath ) )
            fs.unlink(
              me.outPath,
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
  saveOutput( buffer ) {
    const me = this

    return new Promise(
      ( resolve, reject ) => {
        if ( buffer ) {
          if ( me.outPath ) {
            fs.writeFile(
              me.outPath,
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
  generate() {
    const me = this

    return new Promise(
      ( resolve, reject ) => {
        // Check if the user wants to generate a template
        if ( me.templateFile ) {
          // If the path is defined, and it exists then proceed with generation
          if ( fs.existsSync( me.templateFile ) ) {
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
              me.templateFile,
              {
                container: me.templateData
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
}