/*
===============================================================================
 *                                                                            *
 * Defines all of the routes our application handles.                         *
 *                                                                            *
 * Middleware for authenticating the user is also included to make sure       *
 * files cannot be accessed unless the user is logged in.                     *
 *                                                                            *
===============================================================================
*/
import { Request, Response, NextFunction } from 'express'
import * as assert from 'assert'
import * as crypto from 'crypto'
import * as path from 'path'
import { promisify } from 'util'

import * as fs from 'fs-extra'
import * as csv from 'csv-express'
import * as request from 'request'
import * as multer from 'multer'

import * as debug from 'debug'
const log = debug('app:log')
const error = debug('app:error')

/* local modules */
import { getFileEntry, listFiles } from './utils/fsutils'
import { getCsvHeaders, getCsvColumns } from './utils/csvutils'

import { secret } from '../config/secret'

export default (app, passport) => {

  /* Path for file upload is initialized at '../files' and is updated
  as the user navigates through different directories. */
  let storagePath: string = path.join(__dirname, '../../files')

  /* Handles file storage for uploaded files through multer. */
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, storagePath)
    },
    filename: (req, file, callback) => {
      callback(null, file.originalname)
    },
  })

  /* Options for file uploads with multer can be configured here. */
  const upload = multer({
    storage,
  }).fields([
    // Only allows one file to be uploaded for the time being.
    { name: 'userFile', maxCount: 1 },
  ])

  /**
   * Middleware to make sure the user is logged in.
   */
  const isLoggedIn = (req: Request, res: Response, next: NextFunction) => {
    // Don't do anything if the user is authenticated.
    if (req.isAuthenticated()) {
        return next()
    }
    // Send 403 if user is not authenticated.
    res.status(403).json({ error: { message: 'User not authorized.' }})
  }

  /**
   * Handles user authentication. If the username/password combination is correct,
   * a session cookie is given to the client.
   */
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/',
    failureRedirect: '/error'
  }))

  app.get('/', (req: Request, res: Response) => {
    res.json({ success: { message: 'You\'ve successfully connected to the backend server.' } })
  })

  app.get('/error', (req: Request, res: Response) => {
    res.status(403).json({ error: { message: 'Unable to authorize user.' } })
  })

  // GET requests for everything else are handled through this path
  app.get('/files*', isLoggedIn, async (req: Request, res: Response) => {
    const filepath = decodeURIComponent(req.path)
    handleGetRequest(req, res, filepath)
  })

  /**
   * Files can also be accessed directly through file IDs.
   * When files are accessed this way, the user does not have to be logged in,
   * making it possible for collaborators to access files without being part of the system.
   */
  app.get('/id/:id', async (req, res) => {
    const decipher = crypto.createDecipher('aes192', secret)
    const filepath = decipher.update(req.params.id, 'hex', 'utf8')
      + decipher.final('utf8')
    handleGetRequest(req, res, filepath)
  })

  /**
   * This function handles GET request, whether the file path was directly accessed
   * or was requested through a path id.
   */
  async function handleGetRequest(req, res, filepath: string) {
    const fullpath = path.join(__dirname, '../..', filepath)
    try {
      const meta = await getFileEntry(filepath, false)
      const stats = await promisify(fs.lstat)(fullpath)
      /**
       * If the meta view is specified, backend returns metadata.
       */
      if (req.query.view === 'meta') {
        /**
         * If the parameter include_children is included in the query, and the
         * specified path corresponds to a directory, include the metadata for
         * the children as well.
         */
        if (req.query.include_children && stats.isDirectory()) {
          meta.children = await listFiles(filepath)
        }
        res.json(meta)
        return
      }

      if (stats.isDirectory()) {
          /**
           * Path corresponding to directory should not be called unless
           * meta view is specified.
           */
          res.status(400).json({ error: { message: 'Invalid path' }})
          return

      } else if (stats.isFile()) {
        /**
         * If the query includes action parameter 'download', send the raw file.
         */
        if (req.query.action === 'download') {
          res.sendFile(fullpath)
          return
        }
        const ext = path.extname(filepath)

        /* If the file selected is a CSV, the data visualization window is loaded. */
        if (ext === '.csv') {
          /**
           * If column parameters have been specified, backend returns a CSV
           * response with the entries from the selected columns.
           */
          if (req.query.cols) {
            const cols = req.query.cols.split(',').map(col => parseInt(col, 10))
            const data = await getCsvColumns(fullpath, cols)
            res.csv(data)
            return
          } else {
            /**
             * No other views are supported.
             */
            res.status(400).json({ error: { message: 'Invalid path' }})
            return
          }
        } else if (ext === '.png' || ext === '.jpg' || ext === '.dzi') {
          /**
           * Images have not been implemented yet.
           */
          res.send('Image')
          return
        } else {
          res.sendFile(fullpath)
          return
        }
      }
    } catch (e) {
      error(e)
      res.status(500).json({ error: { message: 'Server error' }})
    }
  }

  // POST requests for everything else are handled through this path
  app.post('/files*', async (req, res) => {
    let filepath = decodeURIComponent(req.path)
    const fullpath = path.join(__dirname, '..', filepath)

    try {
      /* File uploads are handled here. Chunking for large files is handled
         by multer and are not dealt with here. */
      if (req.query.action === 'upload') {
        storagePath = fullpath

        const filelist = await listFiles(filepath)

        upload(req, res, err => {
          /* When the file uploader is empty. */
          if (req.files.userFile === undefined) {
            res.status(500)
            .json({ error: { message: 'Please specify file to upload' } })
            return
          }
          if (err) { return err }
          const uploadedFilename = req.files.userFile[0].originalname

          // form element in HTML must be named userFile as well
          if (req.files.userFile) {
            res.redirect(req.path)
          }
        })
      } else if (req.query.action === 'delete') {
        const removed = await promisify(fs.remove)(fullpath)
        log('Deleted file. ')
        filepath = path.join(filepath, '..')
      }
    } catch (e) {
      error(e)
      res.status(500).json({ error: { message: 'Server error' }})
      return
    }
  })

}
