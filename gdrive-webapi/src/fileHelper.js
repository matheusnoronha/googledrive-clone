import fs from 'fs'
import path from 'path'
import prettyBytes from 'pretty-bytes'

export default class FileHelper {
    static async getFilesStatus(downloadsFolder) {
        const currentFiles = await fs.promises.readdir(downloadsFolder)
        const statuses = await Promise
            .all(
                currentFiles
                    .map(
                        file => fs.promises.stat(`${downloadsFolder}/${file}`)
                    )
            )
        const filesStatuses = []
        for (const fileIndex in currentFiles) {
            const { birthtime, size } = statuses[fileIndex]
            filesStatuses.push({
                size: prettyBytes(size),
                file: currentFiles[fileIndex],
                lastModified: birthtime,
                owner: process.env.USER,
                url: path.join('http://localhost:3000', downloadsFolder)
            })
        }

        return filesStatuses
    }

    static async getFiles(downloadsFolder) {
        const currentFiles = await fs.promises.readdir(downloadsFolder)
        const files = await Promise
            .all(
                currentFiles
                    .map(
                        file => fs.createReadStream(`${downloadsFolder}/${file}`)
                        // file => ({
                        //     stream: fs.createReadStream(`${downloadsFolder}/${file}`),
                        //     fileName: file
                        // })
                    )
            )
        return files
    }
}