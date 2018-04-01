import * as express from 'express'
import * as path from 'path'

import * as morgan from 'morgan' // logging
import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as cors from 'cors'
import * as colors from 'colors'

import routes from './app/routes'

const PORT = process.env.PORT || 4000
const ENV = process.env.ENV || 'development'

const app = express()
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.use(morgan('dev'))
app.use(cors())

app.use(session({
    secret: 'utahinrichs',    // session secret; can be anything
    resave: false,
    saveUninitialized: false, // no need to identify users who do not log in
}))

const expressRoutes = routes(app)

app.listen(PORT, () => {
    console.log('App is listening at http://127.0.0.1:' + PORT + '/')

}).on('error', err => {
    console.log('error '.red + 'Port ' + PORT + ' is already in use.')
    process.exit(1)
})
