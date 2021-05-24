const fs = require('fs')
const path = require('path')

const fp = path.join(__dirname, '..', 'other', 'metrics.json')

const data = require(fp)

function addOne (category) {
  data[category] += 1
  saveData()
}

function saveData () {
  fs.writeFileSync(fp, JSON.stringify(data))
}

module.exports = addOne
