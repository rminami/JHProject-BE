import * as express from 'express'
import * as path from 'path'

import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as cors from 'cors'

// Logger and debugger
import * as debug from 'debug'
import * as colors from 'colors'
import * as morgan from 'morgan'
import * as morganDebug from 'morgan-debug'
import * as supportsColor from 'supports-color'

import routes from './app/routes'

const PORT = process.env.PORT || 4000
const ENV = process.env.ENV || 'development'

const app = express()
app.use(cors())
app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const log = debug('app:log')
const error = debug('app:error')
app.use(morganDebug('app:router', 'dev'))

app.use(session({
  secret: 'utahinrichs',
  resave: false,
  saveUninitialized: false, // no need to identify users who do not log in
}))

const expressRoutes = routes(app)

app.listen(PORT, () => {
  log('App is listening at http://127.0.0.1:' + PORT + '/')

}).on('error', err => {
  error('error '.red + 'Port ' + PORT + ' is already in use.')
})
