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
import * as assert from 'assert'
import * as crypto from 'crypto'
import * as path from 'path'
import { promisify } from 'util'

import * as fs from 'fs-extra'
import * as csv from 'csv-express'
import * as request from 'request'
import * as multer from 'multer'

/* local modules */
import { getFileEntry, listFiles } from './utils/fsutils'
import { getCsvHeaders, getCsvColumns } from './utils/csvutils'

import { secret } from '../config/secret'

export default app => {

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

    app.get('/', (req, res) => {
        res.redirect('/files')
    })

    /**
     * Files can also be accessed directly through file IDs.
     * When files are accessed this way, the user does not have to be logged in,
     * making it possible for collaborators to access files without being part of the system.
     */
    app.get('/id/:id', async (req, res) => {
        const decipher = crypto.createDecipher('aes192', secret)
        const filepath: string = decipher.update(req.params.id, 'hex', 'utf8') + decipher.final('utf8')
        handleGetRequest(req, res, filepath)
    })

    // GET requests for everything else are handled through this path
    app.get('/files*', async (req, res) => {
        const filepath: string = decodeURIComponent(req.path)
        handleGetRequest(req, res, filepath)
    })

    /**
     * This function handles GET request, whether the file path was directly accessed
     * or was requested through a path id.
     */
    async function handleGetRequest(req, res, filepath: string) {
        const fullpath: string = path.join(__dirname, '../..', filepath)
        try {
            const meta = await getFileEntry(filepath)
            if (req.query.view === 'meta') {
                if (req.query.include_children !== undefined) {
                    meta.children = await listFiles(filepath)
                }
                return res.json(meta)
            }
            const stats = await promisify(fs.lstat)(fullpath)

            // Renders file browse window if the selected path is a directory.
            if (stats.isDirectory()) {
                // const filelist = await listFiles(filepath);
                res.render('filebrowse', {message: '', meta, loggedIn: true})

            } else if (stats.isFile()) {
                /* If the query includes an action query 'download',
                   send the raw file for download. */
                if (req.query.action === 'download') {
                    res.sendFile(fullpath)
                    return
                }
                const ext = path.extname(filepath)

                /* If the file selected is a CSV, the data visualization window is loaded. */
                if (ext === '.csv') {
                    /* If the query includes view=headers, sends a JSON with the headers. */
                    if (req.query.view === 'headers') {
                        const headers = await getCsvHeaders(fullpath)
                        res.json(headers)
                        return
                    }
                    /* If parameters have not been specified, the backend assumes this is the
                       initial load and sends the metadata (column headers). */
                    if (req.query.cols === undefined) {
                        // const headers = await getCsvHeaders(fullpath)
                        // res.render('dataview', {headers, meta, loggedIn: true})

                    /* If column parameters have been specified, backend returns a CSV response
                       with the entries from the selected columns. */
                    } else {
                        const cols = req.query.cols.split(',').map(col => parseInt(col, 10))
                        const data = await getCsvColumns(fullpath, cols)
                        res.csv(data)
                    }

                /* If the file selected is an image, the image navigation window is loaded.
                   Any image should be preprocessed by the backend into a zoomable image. */
                } else if (ext === '.png' || ext === '.jpg' || ext === '.dzi') {
                    res.send('Image')
                } else {
                    res.sendFile(fullpath)
                }
            }
        } catch (e) {
            console.log(e)
            res.send('Path could not be read.') // TODO proper 404 page
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
                        res.status(500).json({
                            error: {
                                status_code: 500,
                                message: 'Please specify file to upload.',
                            },
                        })
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
                console.log('Deleted file. ')

                filepath = path.join(filepath, '..')
                res.redirect(path.join(filepath, '..', '?success=true'))
            }
        } catch (e) {
            console.log(e)
            res.status(e.status || 500).json({
                error: {
                    status_code: e.status || 500,
                    message: e.code,
                },
            })
            return
        }
    })

}
