const yaml = require('js-yaml')
const fs = require('fs')

class Config {
    constructor(fileName = 'config.yaml', dataDefaults = {}) {
        this.defaultsData = dataDefaults
        this.data = {}
        this.fileName = fileName
    }

    exist() {
        return fs.existsSync(this.fileName)
    }

    load() {
        this.data = yaml.safeLoad(fs.readFileSync(this.fileName, 'utf8'));
    }

    save(customData = null) {
        if (this.exist()) {
            if (customData) fs.writeFileSync(this.fileName, yaml.safeDump(customData), 'utf8')
            else fs.writeFileSync(this.fileName, yaml.safeDump(this.data), 'utf8')
        }
    }

    saveDefaults() {
        if (!this.exist()) {
            fs.writeFileSync(this.fileName, yaml.safeDump(this.defaultsData), 'utf8')
        }
    }

    set(obj) {
        this.data = {...this.data, ...obj}
    }

    get() {
        return this.data
    }
}


module.exports = Config