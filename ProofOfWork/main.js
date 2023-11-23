const sha256 = require('crypto-js/sha256')

const ecLib = require('elliptic').ec
const ec = new ecLib('secp256k1') // 椭圆曲线

class Transaction {
  constructor(from, to, amount) {
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
    if (this.from === '') return true

    const keyObj = ec.keyFromPublic(this.from, 'hex')
    return keyObj.verify(this.computeHash(), this.signature)
  }
}

// const keyPairSender = ec.genKeyPair()
// const keyPairReceiver = ec.genKeyPair()

// const t1 = new Transaction(
//   keyPairSender.getPublic('hex'),
//   keyPairReceiver.getPublic('hex'),
//   10
// )
// t1.sign(keyPairSender)
// console.log(t1)
// t1.amount = 20
// console.log(t1.isValid())

// 区块类
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
        this.preHash +
        this.nonce +
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
    // 挖矿前进行检验transaction合法性
    if (!this.validateTransaction())
      throw new Error('Found InValid Transaction before Mining!') //但是挖的时候对transaction进行篡改呢
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

// 链
class Chain {
  constructor() {
    this.chain = [this.makeGenesis()] // 初始化原始
    this.transactionPool = []
    this.minerReward = 50
    this.difficulty = 3 // 设置挖矿难度
  }

  // 生成原始区块
  makeGenesis() {
    return new Block('原始人', '') // 原始区块，索引为0，所以没有preHash
  }

  // 手动增加区块
  addBlock(newBlock) {
    newBlock.preHash = this.getLatestBlock().hash
    // 因为在外部无法得知此时的preHash是什么，所以手动赋值
    newBlock.hash = newBlock.computeHash()
    // computeHash()在Block类是构造时候调用的，但是newBlock传入的时候没有preHash，所以构造的Hash是错的，需要重新生成
    newBlock.mine(this.difficulty)
    this.chain.push(newBlock) // 别忘了往链上添加
  }

  // 获得最新的区块
  getLatestBlock() {
    return this.chain[this.chain.length - 1]
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

      // 判断当前Block的data是否被篡改
      const blockToValidate = this.chain[i]
      if (blockToValidate.hash !== blockToValidate.computeHash()) return false

      // 比对前一个Block与当前Block的hash值是否相同
      const preBlock = this.chain[i - 1]
      if (preBlock.hash !== blockToValidate.preHash) return false
    }
    console.log('ValidateChain Successful!')
    return true
  }

  // 方便添加Transaction到Pool
  addTransaction(transaction) {
    // 检验transaction是否合法
    if (!transaction.isValid())
      throw new Error('Found InValid Transaction before adding to pool!')
    this.transactionPool.push(transaction)
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

const fanCoin = new Chain()
// console.log(fanCoin)

// let block2 = new Block('区块2', '')
// let block3 = new Block('区块3', '')

// fanCoin.addBlock(block2)
// fanCoin.addBlock(block3)
// console.log(fanCoin.validateChain())
// fanCoin.chain[1].data = '区块233'
// fanCoin.chain[0].data = '原始人寄'
// fanCoin.chain[0].hash = fanCoin.chain[0].computeHash()
//   '46a621ecdd4478020edc31b7a861125f236cd29450fede6395a32f7cfb6d388f' // 需要考虑到直接修改hash的情况

// fanCoin.chain[1].data = '区块233'
// fanCoin.chain[1].mine(3)

// const t1 = new Transaction('fan1', 'fan2', 10)
// const t2 = new Transaction('fan2', 'fan1', 5)
// fanCoin.addTransaction(t1)
// fanCoin.addTransaction(t2)
// fanCoin.mineTransactionPool('牢大')
// console.log(fanCoin)
// console.log(fanCoin.chain[1])
// fanCoin.validateChain()

const keyPairSender = ec.genKeyPair()
const keyPairReceiver = ec.genKeyPair()

const t1 = new Transaction(
  keyPairSender.getPublic('hex'),
  keyPairReceiver.getPublic('hex'),
  10
)
t1.sign(keyPairSender)
// console.log(t1)

// 篡改其转账数量
// t1.amount = 20
// console.log(t1.isValid()) // false
console.log(t1.isValid())
fanCoin.addTransaction(t1)
fanCoin.mineTransactionPool('fan')
console.log(fanCoin)
console.log(fanCoin.chain[1])
