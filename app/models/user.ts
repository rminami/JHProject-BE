import { Document, Schema, Model, model } from 'mongoose'
import * as bcrypt from 'bcrypt-nodejs'

// More hash rounds = more secure; 12 should be enough
const hashRounds = 12

/**
 * User schema only has email address and password for now.
 * Might be a good idea to add first name, last name, role, etc.
 */
const userSchema: Schema = new Schema({
  local: {
    email: String,
    password: String,
  }
})

/**
 * Hashes passwords using bcrypt.
 *
 * @param {string} password - The password, in cleartext
 * @returns {string} - The hash generated from the password.
 */
userSchema.methods.generateHash = (password: string): string => (
  bcrypt.hashSync(password, bcrypt.genSaltSync(hashRounds))
)

/**
 * Checks if the password is valid by comparing hash values.
 *
 * @param {string} password - The password to check.
 * @returns {boolean} - Whether or not the hash matches that of the user.
 */
userSchema.methods.validPassword = function(password: string): boolean {
  return bcrypt.compareSync(password, this.local.password)
}

/**
 * Exposes model to the rest of the backend server.
 */
export const User = model('User', userSchema)
