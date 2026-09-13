const fs = require('fs')
const path = require('path')
const dbPath = `${path.dirname(__filename)}/../db.json`

// Need this middleware to catch some requests
// and return both conversations where userId is sender or recipient
module.exports = (req, res, next) => {
  if (/conversations/.test(req.url) && req.method === 'GET') {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    const userId = req.query?.senderId
    const result = db?.conversations?.filter(
      conv => conv.senderId == userId || conv.recipientId == userId
    )

    res.status(200).json(result)
    return
  }

  next()
}