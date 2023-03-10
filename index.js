var express = require( 'express' )
const routes = require( './routes/router' )
var app = express()
app.set( 'port', ( process.env.PORT || 5000 ) );
app.use( express.json() )


app.use( '/', routes );

app.listen( app.get( 'port' ), function ()
{
  console.log( 'Server listening on port: ', app.get( 'port' ) );
} );



