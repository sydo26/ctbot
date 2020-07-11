const Ctbot = require('../src/Ctbot')
const fs = require('fs')
require('dotenv').config()


const init = async () => {
    const comments = fs.readFileSync(require('path').resolve(__dirname, 'comments3p.txt'), 'UTF-8').split(/\r?\n/)

    const bot = new Ctbot({
        timeout: 0
    })

    await bot.init()

    await bot.initPage()

    if (await bot.login(proccess.env.INSTA_USERNAME, proccess.env.INSTA_PASSWORD)) {
        // await bot.comment({
        //     comment: "Testando",
        //     targetPost: proccess.env.INSTA_POST,
        //     interval: 1000 * 10, // 10 seconds,
        // })
        await bot.listComments({
            listName: "sorteio_capinhas",
            comments,
            targetPost: process.env.INSTA_POST,
            inteval: 1000 * 5, // seconds
            repeat: 2
        })
    }

    await bot.close()
}

init()