var redis = require( 'redis' );
var kue = require( 'kue' );
var axios = require( 'axios' );
var validUrl = require( 'valid-url' );
const dotenv = require( 'dotenv' );

dotenv.config( { path: './config.env' } )

///<------------connecting redis----------------->
const client = redis.createClient(
    process.env.REDIS_PORT, //port number
    process.env.REDIS_HOST, //host
    { no_ready_check: true }
);
//password
client.auth( process.env.REDIS_PASSWORD, function ( err )
{
    if ( err ) throw err;
} );

client.on( "connect", async function ()
{
    console.log( "connected to Redis Server Successfully ❄" );
} );

const queue = kue.createQueue( {
    prefix: 'q',
    redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_HOST,
        auth: process.env.REDIS_PASSWORD,
    }
} );
queue.on( 'error', function ( err )
{
    console.log( 'Kue Error: ', err );
} );


//-----------Queue Function------------//

function createJob ( myUrl, res )
{
    try
    {
        var job = queue.create( 'request', myUrl ).priority( 'high' ).removeOnComplete( true ).save( function ( err )
        {
            if ( !err )
            {
                res.send( "Your new id for the url is " + job.id );         // The key to the data is the provided link
                client.hset( job.id, 'data', 'none', redis.print );        // creates a new hashed object {data.id : request}
            }                                                         //  request is initally set to none
            else
            {
                res.send( "There was an error importing your data" );
            }
        } );
    } catch ( error )
    {
        return res.status( 500 ).send( { status: false, message: error.message } )
    }
}

function requestStatus ( id, res )
{
    try
    {
        client.hget( id, 'data', function ( err, obj )
        {
            if ( err )
            {
                res.send( err );
            }
            else if ( obj == null )
            {
                res.send( "This key does not exist! Check your spelling or try a new key" );
            }
            else if ( obj == 'none' )
            {
                res.send( "This task is still running" );
            }
            else
            {
                res.send( obj );
            }
        } );
    } catch ( error )
    {
        return res.status( 500 ).send( { status: false, message: error.message } )
    }
}

function processRequest ( job, done )
{ // Process that grabs the HTML and updates the Redis hash 
    axios.get( job.data )
        .then( function ( response )
        {
            client.hset( job.id, 'data', response.data, redis.print );
            done();
        } );
}

queue.process( 'request', 5, function ( job, done )
{ // the queue can process multiple jobs, currently set to 5
    processRequest( job, done );
} );



const addJobQueue = async ( req, res ) =>
{
    try
    {
        const { url } = req.params;
        const link = `http://${ url }`
        if ( /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/.test( link ) )
        {
            createJob( link, res )
        }
        else
        {
            return res.status( 400 ).send( { status: false, message: "Please Enter a Valid URL" } )
        }

    } catch ( error )
    {
        return res.status( 500 ).send( { status: false, message: error.message } )
    }
}



const getJobQueue = async ( req, res ) =>
{
    try
    {
        const { id } = req.params;
        requestStatus( id, res )

    } catch ( error )
    {
        return res.status( 500 ).send( { status: false, message: error.message } );
    }

}



module.exports = {
    addJobQueue, getJobQueue
}