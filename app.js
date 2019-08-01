require( 'dotenv' ).config();

const TwitchJS = require( 'twitch-js' );
const request = require( 'request' );
const Storage = require( 'node-storage' );

const { runCommand } = require( './command' );
const { translateMessage, translateMessageWithAzure } = require( './translate' );

const store = new Storage( "channels.db" );
const translations = new Storage( "translations.db" );
const channels = store.get( "channels" ) || {};
const botChannelName = "#" + process.env.TWITCHUSER;
const prefix = '!'
const prefixRegex = new RegExp( '^' + prefix )

const client = new TwitchJS.client( {
  options: {
    debug: false
  },
  connection: {
    reconnect: true,
  },
  channels: Object.keys( channels ).concat( botChannelName ),
  identity: {
    username: process.env.TWITCHUSER,
    password: process.env.OAUTH
  },
} );
client.on( 'chat', onMessage );
client.on( 'connected', ( address, port ) => console.log( `Connected: ${ address }:${ port }` ) );
client.on( 'reconnect', () => console.log( 'Reconnecting' ) );
client.connect();

const appInjection = { client, prefixRegex, botChannelName, store, channels, translations, request }

const errorPrefix = "\n[onMessage]  "

function onMessage( channel, userstate, message, self ) {
  if( self ) return;
  if( userstate.username === "chattranslator" ) return;

  try {
    if( message.match( prefixRegex ) ) {
      runCommand( channel, userstate, message, appInjection )
    } else if( channels[ channel ] ) {
      translateMessageWithAzure( channel, userstate, message, appInjection )
    }
  } catch( error ) {
    console.log(
      errorPrefix + "Failed handling message!",
      errorPrefix + "From:  " + userstate.username,
      errorPrefix + "Message:  " + message,
      errorPrefix + "Error:  ", error
    );
  }
}
