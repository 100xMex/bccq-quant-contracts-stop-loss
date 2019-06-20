const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let futuresOkex;
let okPrices = { ask: null, bid: null, updated: 0 };

// 开仓 - 要返回是否成功, 均价, 张数
const openOrder = async () => { };
// 平仓 - 要返回是否成功, 均价, 张数
const closeOrder = async () => { };

// 设置止盈止损单 - 是否成功
const openTrigger = async () => { };
// 撤销止盈止损单 - 是否成功
const closeTrigger = async () => { };

// 获取当前仓位
const loadPos = async () => { };
// 获取当前挂单
const loadOrders = async () => { };
// 获取当前止盈止损单
const loadTrigger = async () => { };

const startService = () => {
  const futuresInstrumentId = `${COIN_NAME}-USD-${DATE.OKEx}`;

  futuresOkex = new FuturesOkex(futuresInstrumentId, configOkex);
  futuresOkex.subscribe();

  futuresOkex.on('orderbook5', () => {
    // console.log('Ask %j Bid %j', futuresOkex.orderbook5.asks[0], futuresOkex.orderbook5.bids[0]);
    // console.log('Bid %j', futuresOkex.orderbook5.bids[0]);
    // console.log('Ask %j', futuresOkex.orderbook5.asks[0]);
    okPrices = futuresOkex.getAsk1Bid1(LEVEL);
    okPrices.updated = Date.now();
  });

  return futuresOkex;
};

module.exports = {
  getFutures: () => futuresOkex ? futuresOkex : startService(),
  getPrices: () => okPrices,
  openOrder, closeOrder, openTrigger, closeTrigger, loadPos, loadOrders, loadTrigger
};
