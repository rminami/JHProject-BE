import * as express from 'express'
import * as path from 'path'

import * as bodyParser from 'body-parser'
import * as cookieParser from 'cookie-parser'
import * as session from 'express-session'
import * as cors from 'cors'

import * as passport from 'passport'
import * as mongoose from 'mongoose'
import * as flash from 'connect-flash'

// Logger and debugger
import * as debug from 'debug'
import * as colors from 'colors'
import * as morgan from 'morgan'
import * as morganDebug from 'morgan-debug'
import * as supportsColor from 'supports-color'

// Local imports
import routes from './app/routes'
import passportConfig from './config/passport'
import { databaseURL } from './config/database'

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
  secret: 'utahinrichs',     // change this for production
  resave: false,             // touch function does everything we need
  saveUninitialized: false,  // no need to identify users who do not log in
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

passportConfig(passport)
const expressRoutes = routes(app, passport)

log(`Running in ${ENV} mode.`)

mongoose.connect(databaseURL)
.then(() => {
  log('Connected to MongoDB.')
  app.listen(PORT, () => {
    log(`App is listening at http://127.0.0.1:${PORT}/`)
  }).on('error', e => {
    error('Server could not be started.')
    error(`Are you sure port ${PORT} is not in use?`)
  })
})
.catch(err => {
  error('Could not connect to MongoDB.')
  process.exit(1)
})
