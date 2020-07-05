const pteer = require('puppeteer')

const signIn = async () => {
    const browser = await pteer.launch({ args: ['--no-sandbox'] })
    console.log("OK")
}

signIn()