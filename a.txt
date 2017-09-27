'use strict';

const express    = require( 'express' );
const bodyparser = require( 'body-parser' );
const router     = require( './server/api' );
const app        = express();

app.use( express.static( 'public' ));
app.use( bodyparser.json() );

app.use( '/api', router );

app.listen( process.env.PORT || 8080 );
