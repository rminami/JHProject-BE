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
 * Hashes passwords using bcrypt before storing them in the database.
 */
userSchema.methods.generateHash = (password: string): string => (
  bcrypt.hashSync(password, bcrypt.genSaltSync(hashRounds), null)
)

/**
 * Checks if the password is valid.
 */
userSchema.methods.validPassword = function(password: string): string {
  return bcrypt.compareSync(password, this.local.password)
}

/**
 * Exposes model to the rest of the backend.
 */
export const User = model('User', userSchema)
