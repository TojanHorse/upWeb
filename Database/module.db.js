const mongoose = require('mongoose')

async function DatabaseConnect(URL) {
    try {
        await mongoose.connect(URL);
        console.log("Database Connected Successfully")
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    DatabaseConnect
}