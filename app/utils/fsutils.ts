/*
===============================================================================
 *                                                                            *
 * Functions involving interactions with the file system.                     *
 *                                                                            *
===============================================================================
 */
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'

import * as crypto from 'crypto'
import { secret } from '../../config/secret'

interface IFileEntry {
    file_path: string,
    file_name: string,
    id: string,
    supported_views: {},
    type: 'directory' | 'tabular' | 'scalable_image' | 'file',
    metadata: {},
    status: 'uploading' | 'preprocessing' | 'ready',
    children?: IFileEntry[]
}

/**
 * Return a list of files contained in the specified directory.
 *
 * @param {string} parentPath - Path to the parent directory to look in.
 * @returns {Promise<IFileEntry[]>} A sorted list of file entries, complete with metadata.
 */
export const listFiles = async (parentPath: string): Promise<IFileEntry[]> => {
    const fullPath: string = path.join(__dirname, '../..', parentPath)
    const fileNameArr: string[] = await promisify(fs.readdir)(fullPath)

    const filelist: IFileEntry[] = await scanFiles(parentPath, fileNameArr)
    return filelist.filter(file => file !== undefined)
        .sort(compareEntries)
}

/**
 * Returns an array of file entries, each with the metadata
 *     as required in the protocol.
 *
 * @param {string} parentPath - Path to the parent directory to look in.
 * @param {string[]} fileNameArr - Array of names of files contained in directory.
 * @returns {Promise<IFileEntry[]>} Array of files complete with metadata.
 */
const scanFiles = (parentPath: string, fileNameArr: string[]): Promise<IFileEntry[]> => {
    return Promise.all(fileNameArr.map(async fileName => {
        // Files whose names start with '.' should not be displayed.
        if (fileName.startsWith('.')) {
            return undefined
        }
        try {
            const filePath: string = path.join(parentPath, fileName)
            return await getFileEntry(filePath)
        } catch (e) {
            console.log('Could not get stats for file ' + fileName)
            return undefined
        }
    }))
}

// Initial value for the metadata field as specified in the protocol.
const initialMetadata = {
    version: 1,
    namespaces: {},
}

/**
 * Returns an entry for the file specified, complete with metadata.
 *
 * @param {string} filePath - Path to the file to retrieve metadata for.
 * @returns {Promise<IFileEntry>} File entry containing all of the relevant metadata.
 */
export const getFileEntry = async (filePath: string): Promise<IFileEntry> => {
    const file: string = path.basename(filePath)
    const stats: fs.Stats = await promisify(fs.lstat)(path.join(__dirname, '../..', filePath))

    const cipher: crypto.Cipher = crypto.createCipher('aes192', secret)
    const id: string = cipher.update(filePath, 'utf8', 'hex') + cipher.final('hex')

    if (stats.isDirectory()) {
        return {
            file_path: filePath,
            file_name: file,
            id,
            supported_views: {
                meta: null,
                raw: {
                    size: stats.size,
                },
            },
            type: 'directory',
            metadata: initialMetadata,
            status: 'ready',
        }
    }
    const ext = path.extname(file)
    switch (ext) {
        case '.csv':
            return {
                file_path: filePath,
                file_name: file,
                id,
                supported_views: {
                    meta: null,
                    raw: {
                        size: stats.size,
                    },
                    tabular: {
                        // Although the spec specifies metadata to be placed here,
                        // this is unnecessary for the file view.
                    },
                },
                type: 'tabular',
                metadata: initialMetadata,
                status: 'ready',
            }

        case '.png':
        case '.jpg':
        case '.dzi':
            return {
                file_path: filePath,
                file_name: file,
                id,
                supported_views: {
                    meta: null,
                    raw: {
                        size: stats.size,
                    },
                    scalable_image: {
                        // Although the spec specifies metadata to be placed here,
                        // this is unnecessary for the file view.
                    },
                },
                type: 'scalable_image',
                metadata: initialMetadata,
                status: 'ready',
            }

        default:
            return {
                file_path: filePath,
                file_name: file,
                id,
                supported_views: {
                    meta: null,
                    raw: {
                        size: stats.size,
                    },
                },
                type: 'file',
                metadata: initialMetadata,
                status: 'ready',
            }
    }
}

/**
 * Sorts entries so directories are at the top (like GitHub)
 *
 * @param {IFileEntry} entry1 The first file to compare.
 * @param {IFileEntry} entry2 The second file to compare.
 * @returns {number} -1 if the first entry should go before the second entry.
 *                    1 if the second entry should go before the first entry.
 */
const compareEntries = (entry1: IFileEntry, entry2: IFileEntry): number => {
    if (entry1.type === 'directory' && entry2.type !== 'directory') {
        return -1
    } else if (entry1.type !== 'directory' && entry2.type === 'directory') {
        return 1
    } else {
        return entry1.file_name.localeCompare(entry2.file_name)
    }
}
