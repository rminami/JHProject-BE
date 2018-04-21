/*
===============================================================================
 *                                                                            *
 * This file contains functions for parsing CSV files.                        *
 *                                                                            *
===============================================================================
*/
import * as fs from 'fs'
import * as csv from 'fast-csv'
import * as firstline from 'firstline'

/**
 * An interface specifying the format in which CSV metadata should be returned.
 */
interface ICsvMetadata {
  columns: [{
    header: string,
    type: 'number' | 'category',
  }],
  rows: number
}

/**
 * Retrieves CSV metadata.
 *
 * @param {string} filepath - Path to the CSV file.
 * @returns {Promise<ICsvMetadata>} - A promise for CSV metadata.
 */
export const getCsvHeaders = async (filepath: string): Promise<ICsvMetadata> => {
  const line = await firstline(filepath)
  const headerArr = line.split(',').map(item => item.replace(/^"?(.+?)"?$/, '$1'))

  return new Promise<ICsvMetadata>((resolve, reject) => {
    const sets = headerArr.map(_ => new Set())
    let rows = -1 // To account for the header line

    fs.createReadStream(filepath).pipe(csv())
      .on('data', data => {
        sets.map((_, index) => sets[index].add(data[index]))
        rows++

      }).on('end', () => {
        const columns = sets.map((set, index) => {
          /**
           * The column is categorized as a category column if there are 5 or
           * fewer unique values; otherwise, it is categorized as a column of
           * numerical values.
           */
          if (set.size <= 5) {
            return ({
              header: headerArr[index],
              type: 'category',
            })
          } else {
            return ({
              header: headerArr[index],
              type: 'number',
            })
          }
        })
        resolve({ columns, rows })
      }).on('error', err => {
        reject(err)
      })
  })
}

/**
 * Parses CSV and retrieves data from the specified columns.
 *
 * @param {string} filepath - The file path of the CSV file.
 * @param {number[]} columns - The indices of the columns to retrieve.
 * @returns {Promise<number[][]>} - Data from the specified columns.
 */
export const getCsvColumns = async (filepath: string, columns: number[]): Promise<number[][]> => {
  return new Promise<number[][]>((resolve, reject) => {
    const result = []
    fs.createReadStream(filepath).pipe(csv())
      .on('data', data => {
        result.push(columns.map(col => data[col]))
      }).on('end', () => {
        resolve(result)
      }).on('error', err => {
        reject(err)
      })
  })
}
