const puppeteer = require('puppeteer')

const signIn = async () => {
    const browser = await puppeteer.launch({executablePath: '/path/to/Chrome', headless: false, args: ['--no-sandbox']})
    const page = await browser.newPage()
    await page.goto("https://www.instagram.com/")
    await page.screenshot({path: "insta.png"})
    await browser.close()
}

signIn()