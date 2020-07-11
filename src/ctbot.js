const puppeteer = require('puppeteer')
const Config = require('./config')
const fetch = require('node-fetch')

class Ctbot {
    constructor({ timeout = 0 }) {
        this.timeout = timeout
        this.status = false
    }

    browserIsOk() {
        if (!this.browser) return false
        if (!this.browser.isConnected()) return false
        return true
    }

    pageIsOk() {
        if (!this.page) return false
        if (this.page.isClosed()) return false
        return true
    }

    log(prefix, msg) {
        if (prefix && msg) console.log("-", "[" + prefix + "]", msg)
        else if (prefix && !msg) console.log("[", prefix, "]")
        else if (!prefix && msg) console.log(msg)
    }

    async goto(url, { before, after, error }) {
        if (!this.browserIsOk() && !this.pageIsOk()) return
        const results = {}
        this.log("Proccess", before.msg)
        if (before.callback) results.before = await before.callback()
        try {
            await this.page.goto(url, {
                timeout: this.timeout,
                waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"]
            })
            this.log("OK", after.msg)
            if (after.callback) results.after = await after.callback()
        } catch (err) {
            console.log(err)
            this.log("ERROR", error.msg)
            if (error.callback) results.error = await error.callback()
        }
        return results
    }

    async init() {
        this.log("Proccess", "Iniciando o navegador")
        try {
            this.browser = await puppeteer.launch()
            this.log("OK", "Navegador iniciado")
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Não foi possível iniciar o navegador")
        }
    }

    async close() {
        if (!this.browserIsOk()) return
        this.log("Proccess", "Finalizando o navegador")
        try {
            await this.browser.close()
            this.log("OK", "Navegador finalizado")
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Não foi possível finalizar o navegador")
        }
    }

    async initPage() {
        if (!this.browserIsOk() && this.pageIsOk()) return

        this.log("Proccess", "Abrindo uma nova página")
        try {
            this.page = await this.browser.newPage()
            this.log("OK", "Nova página aberta com sucesso")
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Não foi possível abrir uma nova página")
            return
        }

        await this.goto("https://www.instagram.com/accounts/login/", {
            before: {
                msg: "Iniciando a página do instagram",
            },
            after: {
                msg: "Página do instagram iniciada"
            },
            error: {
                msg: "A página do instagram não pode ser iniciada",
                callback: () => this.close
            }
        })

    }

    async login(username, password) {
        if (!this.browserIsOk() && !this.pageIsOk()) return
        this.log("Proccess", "Logando no instagram com o usuário: " + username)
        try {
            await this.page.type('[name="username"]', username);
            await this.page.type('[name="password"]', password);

            await Promise.all([
                this.page.click('[type="submit"]'),
                this.page.waitForNavigation({
                    waitUntil: 'networkidle0',
                    timeout: this.timeout
                }),
            ]);

            const title = await this.page.title()
            if (title.toLowerCase().indexOf("entrar") >= 0) {
                throw new Error("Usuário inexistente!")
            }

            this.log("OK", "Usuário logado com sucesso")
            return true
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Seus dados não foram autenticados")
            await this.close()
            return false
        }
    }

    async verifyTargetPost() {
        this.log("Proccess", "Validando ID do TargetPost")
        try {
            // "https://www.instagram.com/p/" + this.target + "/"
            const response = await fetch("https://api.instagram.com/oembed?url=" + "https://www.instagram.com/p/" + this.target + "/").then(res => res.toString())

            if (response.toString().indexOf('No Media Match') >= 0) throw new Error('No Media Match')
            if (response.toString().indexOf('Private media') >= 0) throw new Error('Private Media')

            this.log("OK", "ID " + this.target + " validado")
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Não foi possível encontrar um post referente a este ID: " + this.target)
            return false
        }

        return true
    }

    async goTargetPost(targetPost) {
        if (!this.browserIsOk() && !this.pageIsOk()) return false
        this.target = targetPost

        if (!(await this.verifyTargetPost())) {
            await this.close()
            return false
        }

        this.log("Proccess", "Iniciando a página do post")
        try {
            this.page = await this.browser.newPage()
            await this.page.goto("https://www.instagram.com/p/" + this.target, {
                timeout: this.timeout,
                waitUntil: ["load", "domcontentloaded", "networkidle0", "networkidle2"]
            })
            this.log("OK", "Página iniciada com sucesso")
            return true
        } catch (error) {
            console.log(error)
            this.log("ERROR", "A página não pode ser iniciada")
            await this.close()
            return false
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async comment({ comment, interval = 5000, targetPost, repeat = 0, reload = false }) {
        if (targetPost && !reload) if (!(await this.goTargetPost(targetPost))) return false
        if (reload) await this.page.reload({
            waitUntil: ["domcontentloaded", "load", "networkidle0", "networkidle2"]
        })
        if (!this.browserIsOk() && !this.pageIsOk()) return false

        this.log(null, "\n\n=========== NOVO COMENTÁRIO ===========\n")

        await this.sleep(1000)

        this.log("Proccess", "Comentário: [" + comment + "] está sendo preparado\n")
        if (interval > 1000) {
            this.log(interval / 1000 + " segundos", "para enviar o comentário")
            for (let i = 1; i < interval / 1000; i++) {
                await this.sleep(1000)
                this.log(Math.floor((interval / 1000) - i) + " segundos", null)
            }
        } else await this.sleep(1000)

        this.log(null, "\n")
        this.log("Proccess", "Adicionando comentário...")
        try {
            await this.page.type('.Ypffh', comment)
            await this.page.focus('.Ypffh')
            await Promise.all([
                this.page.keyboard.press('Enter'),
                this.page.waitForNavigation({
                    waitUntil: ['networkidle0', 'networkidle2'],
                    timeout: this.timeout
                }),
            ]);
            this.log("OK", "Comentário adicionado com sucesso!")
        } catch (error) {
            console.log(error)
            this.log("ERROR", "Falha ao adicionar o comentário")
        }

        this.log(null, "\n=========== FIM ===========\n\n")
        await this.sleep(2000)
        if (repeat > 0) await this.comment({ comment, interval, targetPost, repeat: (repeat - 1) })
    }
    
    async listComments({ listName = "default", interval = 5000, targetPost, repeat = 0, comments }) {
        if (!this.browserIsOk() && !this.pageIsOk()) return false

        let defaultData = {
            by: 'sydo26',
            lists: {}
        }
        defaultData.lists[listName] = {
            current: 1,
            current_repeat: 1,
            execution: 0,
            repeats: repeat,
            loads: comments.length
        }
        const config = new Config(require('path').resolve(__dirname, "ctbot.yaml"), defaultData)
        config.saveDefaults()
        config.load()

        this.log(null, "\n\n=========== NOVOS COMENTÁRIOS ===========\n")

        while (true) {
            config.load()
            let list = config.get().lists[listName]

            if (list.current === 1 && list.repeats === list.current_repeat - 1) break

            // COMMMENT
            if (targetPost) if (!(await this.goTargetPost(targetPost))) return false
            if (!this.browserIsOk() && !this.pageIsOk()) return false
            
            let result = false
            let comment = comments[list.current - 1] ? comments[list.current - 1] : ""
            comment = comment.replace('%pos', list.current)
            this.log(null, "\n")
            this.log("Proccess", "Comentário: [" + comment + "] está sendo preparado\n")
            if (interval > 1000) {
                this.log(null, "Aguarde " + interval / 1000 + " segundos")
                await this.sleep(interval)
            } else await this.sleep(1000)

            this.log(null, "\n")
            this.log("Proccess", "Adicionando comentário")
            try {
                await this.page.type('.Ypffh', comment)
                await this.page.focus('.Ypffh')
                // await this.page.screenshot({path: "screenshot" + list.execution + ".png"})
                await Promise.all([
                    this.page.keyboard.press('Space'),
                    this.page.keyboard.press('Enter'),
                    this.page.waitForNavigation({
                        waitUntil: ['networkidle0', 'networkidle2', 'load', "domcontentloaded"],
                        timeout: this.timeout
                    }),
                ]).then(() => {
                    this.log("OK", "Comentário adicionado com sucesso!")
                });
                result = true
            } catch (error) {
                console.log(error)
                this.log("ERROR", "Falha ao adicionar o comentário")
                result = false
            }

            // FIM COMMENT

            if (result) {
                if (list.current === list.loads) {
                    if (list.repeats != list.current_repeat - 1) {
                        list.current = 1
                        list.current_repeat += 1
                    }
                } else list.current += 1
                list.execution += 1

                let listFinal = {}
                listFinal[listName] = list
                config.set({ lists: listFinal })
                config.save()
            }
        }
        this.log(null, "\n=========== FIM ===========\n\n")

    }

}


module.exports = Ctbot