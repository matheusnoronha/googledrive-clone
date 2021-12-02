import Busboy from 'busboy'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { logger } from './logger.js'
import FileHelper from './fileHelper.js'
import service from './service.js'
import FormData from 'form-data'
import fetch from 'node-fetch'


export default class UploadHandler {
    constructor({ io, socketId, downloadsFolder, messageTimeDelay = 200 }) {
        this.io = io
        this.socketId = socketId
        this.downloadsFolder = downloadsFolder
        this.ON_UPLOAD_EVENT = 'file-upload'
        this.messageTimeDelay = messageTimeDelay
    }

    canExecute(lastExecution) {
        return (Date.now() - lastExecution) >= this.messageTimeDelay
    }

    handleFileBytes(filename) {
        this.lastMessageSent = Date.now()

        async function* handleData(source) {
            let processedAlready = 0

            for await (const chunk of source) {
                yield chunk

                processedAlready += chunk.length
                if (!this.canExecute(this.lastMessageSent)) {
                    continue;
                }

                this.lastMessageSent = Date.now()

                this.io.to(this.socketId).emit(this.ON_UPLOAD_EVENT, { processedAlready, filename })
                logger.info(`File [${filename}] got ${processedAlready} bytes to ${this.socketId}`)
            }
        }

        return handleData.bind(this)
    }
    async onFile(fieldname, file, filename) {
        const saveTo = `${this.downloadsFolder}/${filename}`
        await pipeline(
            // 1o passo, pegar uma readable stream!
            file,
            // 2o passo, filtrar, converter, transformar dados!
            this.handleFileBytes.apply(this, [filename]),
            // 3o passo, é saida do processo, uma writable stream!
            fs.createWriteStream(saveTo)
        )
        await this.checkValidFile(fs.createReadStream(saveTo))
        logger.info(`File [${filename}] finished`)
    }
    async checkValidFile(newFile) {
        const formData = new FormData()
        const files = await FileHelper.getFiles(this.downloadsFolder)
        files.push(newFile)
        for (const file of files) {
            formData.append("files", file)
        }
        const respose = await fetch(`http://localhost:8000/desduplicator`, {
            method: 'POST',
            body: formData
        })
        let value = {}
        await respose.json().then(
            data => {
                value = data
            }
        )
        const { detail: details } = value
        for (const datail of details) {
            datail.shift()
            for (const fileLocal of datail) {
                fs.unlink(fileLocal, function (err) {
                    if (err) {
                        throw err
                    } else {
                        console.log("Successfully deleted the file.")
                    }
                })
            }
        }
    }

    registerEvents(headers, onFinish) {
        const busboy = new Busboy({ headers })
        busboy.on("file", this.onFile.bind(this))
        busboy.on("finish", onFinish)

        return busboy
    }

}