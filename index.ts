'use strict'

import * as express from 'express'
import * as path from 'path'

import * as morgan from 'morgan' // logging
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as colors from 'colors'

const app = express()
const PORT = process.env.PORT || 3000

/* Setting up Express application */
app.use(cookieParser()) // reads cookies
app.use(bodyParser.json()) // gets data from response body
app.use(bodyParser.urlencoded({extended: true}))

/* Setting up logging */
app.use(morgan('dev'))

/* Disables caches -- remove for production */
app.disable('etag')

app.use(session({
    secret: 'utahinrichs', // session secret; can be anything
    resave: false, // resave is unnecessary because session store has touch
    saveUninitialized: false, // no need to identify users who do not log in
}))

/* Setting up routes */
import routes from './app/routes'
const expressRoutes = routes(app)

app.listen(PORT, () => {
    console.log('App is listening at http://127.0.0.1:' + PORT + '/')

}).on('error', err => {
    console.log('error '.red + 'Port ' + PORT + ' is already in use.')
    process.exit(1)
})
