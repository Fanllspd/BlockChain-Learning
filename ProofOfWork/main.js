const sha256 = require('crypto-js/sha256')

// 区块类
class Block {
  constructor(data, preHash) {
    this.data = data
    this.preHash = preHash
    this.nonce = 0
    this.hash = this.computeHash()
  }

  // 生成该区块的Hash
  computeHash() {
    return sha256(this.data + this.preHash + this.nonce).toString()
  }

  //
  getAnswer(difficulty) {
    let Ans = ''
    for (let u = 0; u < difficulty; u++) {
      Ans += '0'
    }
    return Ans
  }

  mine(difficulty) {
    while (true) {
      this.hash = this.computeHash()
      if (this.hash.substring(0, difficulty) === this.getAnswer(difficulty))
        break
      this.nonce++
    }
  }
}

// let b = new Block('asd', '')
// console.log(b)

// 链
class Chain {
  constructor() {
    this.chain = [this.makeGenesis()] // 初始化原始应为空
    this.difficulty = 3 // 设置挖矿难度
  }

  // 生成原始区块
  makeGenesis() {
    return new Block('原始人', '') // 原始区块，索引为0，所以没有preHash
  }

  // 增加区块
  addBlock(newBlock) {
    newBlock.preHash = this.chain[this.chain.length - 1].hash
    // 因为在外部无法得知此时的preHash是什么，所以手动赋值
    newBlock.hash = newBlock.computeHash()
    // computeHash()在Block类是构造时候调用的，但是newBlock传入的时候没有preHash，所以构造的Hash是错的，需要重新生成
    newBlock.mine(this.difficulty)
    this.chain.push(newBlock) // 别忘了往链上添加
  }

  // 对区块进行校验
  validateChain() {
    if (this.chain.length === 1) {
      if (this.chain[0].hash !== this.chain[0].computeHash()) return false
      // 对初始进行校验，原始的Hash与再次生成的Hash进行对比
      return true
    }
    for (let i = 1; i < this.chain.length; i++) {
      const blockToValidate = this.chain[i]
      if (blockToValidate.hash !== blockToValidate.computeHash()) return false
      const preBlock = this.chain[i - 1]
      if (preBlock.hash !== blockToValidate.preHash) return false
    }
    return true
  }
}

let fanChain = new Chain()
// console.log(fanChain)

let block2 = new Block('区块2', '')
let block3 = new Block('区块3', '')

fanChain.addBlock(block2)
fanChain.addBlock(block3)
console.log(fanChain.validateChain())
// fanChain.chain[1].data = '区块233'
// fanChain.chain[0].data = '原始人寄'
// fanChain.chain[0].hash = fanChain.chain[0].computeHash()
//   '46a621ecdd4478020edc31b7a861125f236cd29450fede6395a32f7cfb6d388f' // 需要考虑到直接修改hash的情况

fanChain.chain[1].data = '区块233'
fanChain.chain[1].mine(3)
console.log(fanChain.validateChain())
console.log(fanChain)
