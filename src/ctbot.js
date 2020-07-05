const pteer = require('puppeteer')
const fs = require('fs')
const axios = require('axios')

// Username de autenticação | Senha de autenticação | o ID do post que você quer comentar (Depois do .../p/[ID]) | Arquivo .txt com os comentários por linha
const ctbot = async (username, password, targetPost, wordList, amountExecutions = 1) => {
    if (amountExecutions < 1) {
        console.log("Você não pode ter menos de uma execução.")
        return
    }
    let executions = 1;
    const browser = await pteer.launch()
    try {
        const page = await browser.newPage()

        console.log("Carregando página de login")
        await page.goto("https://www.instagram.com/accounts/login/", { timeout: 0, waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"] })

        console.log("Definindo valores de autenticação do usuário")
        await page.type('[name="username"]', username);
        await page.type('[name="password"]', password);

        console.log("Tentando logar com o usuário")
        await Promise.all([
            page.click('[type="submit"]'),
            page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 0
            }),
        ]);

        const titlePreview = await page.title()

        if (titlePreview.indexOf('Entrar') >= 0) {
            console.log("\nNão foi possível iniciar a sessão com os dados de autenticação informados\n")
            browser.close()
            return
        }

        console.log("Sessão iniciada com sucesso")

        console.log("Redirecionando para o post")

        const response = await axios.get("https://api.instagram.com/oembed", {
            params: {
                url: "https://www.instagram.com/p/" + targetPost + "/"
            }
        })

        if (response.toString().indexOf('No Media Match') >= 0) {
            console.log("O post que você procura não existe ou se encontra arquivado")
            browser.close()
            return
        }
        if (response.toString().indexOf('Private media') >= 0) {
            console.log("O post que você procura é privado, portanto você não possui permissão para comentar.")
            browser.close()
            return
        }

        await page.goto("https://www.instagram.com/p/" + targetPost + "/", { timeout: 0, waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"] })

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
        const sendComment = async (comment, timeout) => {
            await sleep(timeout)
            console.log("\n\n==========================")
            console.log("\nEscrevendo comentário...")
            await page.type('.Ypffh', comment.text)

            console.log("\nEnviando comentário: [" + comment.text + "]\n posição, execução atual", comment.position, comment.execution)
            console.log("==========================\n\n")
            await Promise.all([
                page.click('[type="submit"]'),
                page.waitForNavigation({
                    waitUntil: 'networkidle0',
                    timeout: 0
                }),
            ]);
        }

        console.log("Carregando WordList")
        const listComment = []
        await fs.readFileSync(wordList, 'utf-8').split(/\r?\n/).forEach(async (line) => {
            listComment.push(line)
        })
        console.log("Linhas carregadas da WordList:", listComment.length)

       
        for (let a = 0; a < amountExecutions; a++) {
            let i = 1
            for await (const comment of listComment) {
                await sendComment({ text: comment, position: i++, execution: executions++ }, 1000 * 60)
            }
        }
        
        executions--

        console.log("\n======== Todas(" + executions + ") as linhas enviadas ========\n")


        console.log("Finalizando o browser")
        await browser.close()
        console.log('Finalizado')
        return
    } catch (err) {
        console.error(err)
        executions--

        console.log("\n======== Todas(" + executions + ") as linhas enviadas ========\n")
        console.log("Finalizando o browser")
        await browser.close()
        console.log('Finalizado')
        return
    }
}

module.exports = ctbot