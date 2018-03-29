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

interface ICsvMetadata {
    columns: [{
        header: string,
        type: 'number' | 'category',
    }],
    rows: number
}

/** Retrieves CSV headers for the initial load */
export const getCsvHeaders = async (filepath: string): Promise<any> => {
    const line = await firstline(filepath)
    const headerArr = line.split(',').map(item => item.replace(/^"?(.+?)"?$/, '$1'))

    return new Promise((resolve, reject) => {
        const sets = headerArr.map(_ => new Set())
        let rows = -1 // To account for the header line

        fs.createReadStream(filepath).pipe(csv())
            .on('data', data => {
                sets.map((_, index) => sets[index].add(data[index]))
                rows++

            }).on('end', () => {
                const columns = sets.map((set, index) => {
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

/** Retrieves data from specific columns within a CSV */
export const getCsvColumns = async (filepath: string, columns: number[]): Promise<any> => {
    return new Promise((resolve, reject) => {
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
