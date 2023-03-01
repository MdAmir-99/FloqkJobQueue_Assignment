const router = require( 'express' ).Router();

const { addJobQueue, getJobQueue } = require( '../controller/jobController' );


router.get( '/create/:url', addJobQueue )
    .get( '/status/:id', getJobQueue );

module.exports = router;