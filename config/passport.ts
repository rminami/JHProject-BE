 /*
===============================================================================
 *                                                                            *
 * Strategies for logging in and signing up.                                  *
 *                                                                            *
 * Strategy 'local-login' returns the user if the username/password           *
 * combination is correct; otherwise, it returns an error.                    *
 *                                                                            *
 * Strategy 'local-signup' returns a new user and hashes their password if    *
 * the username has not already been taken; otherwise, it returns an error.   *
 *                                                                            *
===============================================================================
*/

import * as passportLocal from 'passport-local'
import { User } from '../app/models/user'
import { Request, Response } from 'express'

const LocalStrategy = passportLocal.Strategy

export default passport => {

  passport.serializeUser((user, done) => {
    done(undefined, user.id)
  })

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user)
    })
  })

  passport.use('local-login', new LocalStrategy({

    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true

  }, (req: any, email, password, done) => {
    User.findOne({ 'local.email': email }, (err, user: any) => {
      if (err) {
        return done(err)
      }
      if (!user || !user.validPassword(password)) {
        return done(undefined, false)
          // req.flash('loginMessage', 'Incorrect username or password.')
      }
      // Return user if username/password combination is correct.
      return done(undefined, user)
    })
  }))

  passport.use('local-signup', new LocalStrategy({

    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true

  }, (req: any, email, password, done) => {
    process.nextTick(() => {
      User.findOne({ 'local.email': email }, (err, user: any) => {
        if (err) {
          return done(err)
        }
        if (user) {
          return done(undefined, false,
            req.flash('signupMessage', 'Email has already been registered.'))
        }
        const newUser: any = new User()
        newUser.local.email = email
        newUser.local.password = newUser.generateHash(password)

        newUser.save(error => {
          if (error) { throw error }
          return done(null, newUser)
        })
      })
    })
  }))
}
