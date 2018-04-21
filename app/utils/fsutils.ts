/*
===============================================================================
 *                                                                            *
 * Functions involving the file system.                                       *
 *                                                                            *
===============================================================================
 */
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'

import * as crypto from 'crypto'
import { getCsvHeaders } from './csvutils'
import { secret } from '../../config/secret'

/**
 * Interface for an object representing the metadata of a file or directory.
 */
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
 * @param {string} dirPath - Path to the parent directory to look in.
 * @returns {Promise<IFileEntry[]>} A sorted list of file entries, complete with metadata.
 */
export const listFiles = async (dirPath: string): Promise<IFileEntry[]> => {
  const fullPath: string = path.join(__dirname, '../..', dirPath)
  const fileNameArr: string[] = await promisify(fs.readdir)(fullPath)

  const filelist: IFileEntry[] = await scanFiles(dirPath, fileNameArr)
  return filelist.filter(file => file !== undefined)
    .sort(compareEntries)
}

/**
 * Returns an array of file entry objects, each containing the metadata for a
 *     file in the specified directory.
 *
 * @param {string} parentPath - Path of the directory to scan.
 * @param {string[]} fileNameArr - Array of all of the items in the specified directory.
 * @returns {Promise<IFileEntry[]>} a Promise for all of the files' metadata.
 */
const scanFiles = (parentPath: string, fileNameArr: string[]): Promise<IFileEntry[]> => {
  return Promise.all(fileNameArr.map(async fileName => {

    // Files whose names start with '.' should not be displayed.
    if (fileName.startsWith('.')) {
      return undefined
    }
    try {
      const filePath: string = path.join(parentPath, fileName)
      return await getFileEntry(filePath, true)
    } catch (e) {
      throw new Error('Could not get stats for file ' + fileName)
    }
  }))
}

// Initial value for the metadata field as specified in the protocol.
const initialMetadata = Object.freeze({
  version: 1,
  namespaces: {},
})

/**
 * Returns an object containing the metadata for the selected file or directory.
 *
 * @param {string} filePath - Path to the file to retrieve metadata for.
 * @param {boolean} asChild - Specifies whether or not the metadata is being
 *     requested as a child of a parent directory.
 * @returns {Promise<IFileEntry>} Object containing metadata for selected file.
 */
export const getFileEntry = async (filePath: string, asChild: boolean): Promise<IFileEntry> => {
  const file: string = path.basename(filePath)
  const stats: fs.Stats = await promisify(fs.lstat)(path.join(__dirname, '../..', filePath))

  const cipher: crypto.Cipher = crypto.createCipher('aes192', secret)
  const id: string = cipher.update(filePath, 'utf8', 'hex') + cipher.final('hex')

  // For consistency with Ryan's server -- testing purposes only
  if (filePath.startsWith('/files/')) {
    filePath = filePath.slice(7)
  }

  if (stats.isDirectory()) {
    return {
      file_path: filePath,
      file_name: file,
      id,
      supported_views: {
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
          raw: {
            size: stats.size,
          },
          // slice is necessary to remove the '/' at the beginning.
          // tabular: asChild ? {} : await getCsvHeaders(filePath.slice(1)),
          // for testing only
          tabular: asChild ? {} : await getCsvHeaders('files/' + filePath),
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
 * Sorts entries in alphabetical order.
 *
 * @param {IFileEntry} entry1 The first file to compare.
 * @param {IFileEntry} entry2 The second file to compare.
 * @returns {number} -1 if the first entry should go before the second entry.
 *                    1 if the second entry should go before the first entry.
 */
const compareEntries = (entry1: IFileEntry, entry2: IFileEntry): number => {
  return entry1.file_name.localeCompare(entry2.file_name)
}
