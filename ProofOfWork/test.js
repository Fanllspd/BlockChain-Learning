const sha256 = require('crypto-js/sha256')
const ecLib = require('elliptic').ec
const ec = new ecLib('secp256k1') // 椭圆曲线

class Transaction {
  constructor(from, to, amount) {
    // if (from == null || from == '')
    // 视频里没说，但是我觉得应该检验一下
    // throw new Error('Transaction cannot be empty!')
    this.from = from // 发送者公钥
    this.to = to // 接收者公钥
    this.amount = amount // 转账数量
    // this.timeStamp = timeStamp
  }

  // 生成对应数据的hash
  computeHash() {
    return sha256(this.from + this.to + this.amount).toString()
  }

  // 对交易进行签名
  // 签名的意义是将公钥和Transaction公开使所有人都能对此交易进行校验，凭此证明其合法性
  sign(key) {
    this.signature = key.sign(this.computeHash(), 'base64').toDER('hex')
  }

  // 检查交易合法性
  isValid() {
    // 对矿工奖励进行特殊判断
    // 因为矿工奖励是区块链给矿工转账，所以公钥是空
    if (this.from === '') return true

    const keyObj = ec.keyFromPublic(this.from, 'hex')
    return keyObj.verify(this.computeHash(), this.signature)
  }
}

class Block {
  constructor(transactions, preHash) {
    this.transactions = transactions
    this.preHash = preHash
    this.nonce = 0 // 挖的次数
    this.hash = this.computeHash()
    this.timeStamp = Date.now()
  }

  // 生成该区块的Hash
  computeHash() {
    return sha256(
      JSON.stringify(this.transactions) +
        this.nonce +
        this.preHash +
        this.timeStamp
    ).toString()
  }

  // 生成挖矿所比对的前缀 difficulty越大需要时间越长
  getAnswer(difficulty) {
    let Ans = ''
    for (let u = 0; u < difficulty; u++) {
      Ans += '0'
    }
    return Ans
  }

  // 挖！
  mine(difficulty) {
    this.validateTransaction()
    while (true) {
      this.hash = this.computeHash()
      if (this.hash.substring(0, difficulty) === this.getAnswer(difficulty))
        // 进行前缀比对
        break
      this.nonce++
    }
  }

  // 逐个验证transaction是否合法
  validateTransaction() {
    for (const transaction of this.transactions) {
      if (!transaction.isValid)
        // throw new Error("Found inValid Transaction!")
        return false
    }
    return true
  }
}

class Chain {
  constructor() {
    this.chain = [this.makeGenesis()] // 一个链中应由多个区块组成所以赋值成数组
    this.difficulty = 3 // 设置难度为3，也就是需要hash满足前缀三位全为0
    this.transactionPool = []
    this.minerReward = 50
  }

  // 生成起始区间
  makeGenesis() {
    return new Block('Origin', '') // 起始区块，索引为0，所以preHash为0
  }

  // 获得最新的区块
  getLatestBlock() {
    return this.chain[this.chain.length - 1]
  }

  // 手动增加区块
  addBlock(newBlock) {
    newBlock.preHash = this.getLatestBlock().hash
    // 因为在外部无法得知此时的preHash是什么，所以手动赋值
    newBlock.hash = newBlock.computeHash()
    // computeHash()在Block类是构造时候调用的，但是newBlock传入的时候没有preHash，所以构造的Hash是错的，需要重新生成
    newBlock.mine(this.difficulty) // 进行比对前缀
    this.chain.push(newBlock) // 别忘了往链上添加
  }

  // 方便添加Transaction到Pool
  addTransaction(transaction) {
    // 检验transaction是否合法
    if (!transaction.isValid())
      throw new Error('Found InValid Transaction before adding to pool!')
    this.transactionPool.push(transaction)
  }

  // 对区块进行校验
  validateChain() {
    if (this.chain.length === 1) {
      if (this.chain[0].hash !== this.chain[0].computeHash()) return false
      // 对初始进行校验，原始的Hash与再次生成的Hash进行对比
      return true
    }
    for (let i = 1; i < this.chain.length; i++) {
      // 验证Block的每个Transaction是否合法
      if (!this.chain[i].validateTransaction())
        throw new Error('Found InValid Transaction while validating Chain')

      // 判断当前Block的data是否被篡改8
      const blockToValidate = this.chain[i]
      if (blockToValidate.hash !== blockToValidate.computeHash()) return false

      // 比对前一个Block与当前Block的hash值是否相同
      const preBlock = this.chain[i - 1]
      if (preBlock.hash !== blockToValidate.preHash) return false
    }
    return true
  }

  // 交易池
  mineTransactionPool(minerAddr) {
    // 先给矿工发钱
    const minerTransaction = new Transaction('', minerAddr, this.minerReward)
    this.transactionPool.push(minerTransaction)
    // 开挖
    const newBlock = new Block(this.transactionPool, this.getLatestBlock().hash)
    newBlock.mine(this.difficulty)
    // 把区块加到区块链当中
    // 同时清空此时的Pool
    this.chain.push(newBlock)
    this.transactionPool = []
  }
}

// const fanChain = new Chain()
// const block1 = new Block('b1', '111')
// const block2 = new Block('b2', '2')
// fanChain.addBlock(block1)
// fanChain.addBlock(block2)
// console.log(fanChain)
// console.log(fanChain.validateChain())

// 模拟篡改
// fanChain.chain[1].data = 'fake'
// fanChain.chain[1].hash = fanChain.chain[1].computeHash()
// console.log(fanChain.validateChain())
// console.log(fanChain)

// const fanCoin = new Chain()
// const t1 = new Transaction('addr1', 'addr2', 10)
// const t2 = new Transaction('addr2', 'addr1', 20)
// fanCoin.addTransaction(t1)
// fanCoin.addTransaction(t2)
// fanCoin.mineTransactionPool('fan')
// console.log(fanCoin)
// console.log(fanCoin.chain[1].transactions)

// fanCoin.mineTransactionPool(keyPairSender.getPublic('hex'))
// 签名测试
const fanCoin = new Chain()

const keyPairSender = ec.genKeyPair()
const keyPairReceiver = ec.genKeyPair()

const t1 = new Transaction(
  keyPairSender.getPublic('hex'),
  keyPairReceiver.getPublic('hex'),
  10
)
t1.sign(keyPairSender)
console.log(fanCoin)

console.log(t1.isValid())

fanCoin.mineTransactionPool(keyPairSender.getPublic('hex'))
console.log(fanCoin.chain)
