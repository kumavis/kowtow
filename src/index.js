const createCopyFactory = require('./next')

module.exports = createKowtowCopy


function createKowtowCopy (target) {
  const createCopy = createCopyFactory()
  return createCopy(target)
}