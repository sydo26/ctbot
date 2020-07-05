const ctbot = require('../src/ctbot')

require('dotenv').config()

ctbot(process.env.INSTA_USERNAME, process.env.INSTA_PASSWORD, process.env.INSTA_POST, require('path').resolve(__dirname, 'test.txt'), 1)