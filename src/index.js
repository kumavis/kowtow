// const { createDraft } = require('immer')
const createCopyFactory = require('./next')

module.exports = createKowtowCopy


function createKowtowCopy (target) {
  // return createDraft(target)
  const createCopy = createCopyFactory()
  return createCopy(target)
}