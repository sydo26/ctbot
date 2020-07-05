const pteer = require('puppeteer')

const signIn = async () => {
    const browser = await pteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    console.log("OK")
}

signIn()