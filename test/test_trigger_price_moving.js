const BN = require('bignumber.js');
const MovingTriggerPrice = require('@bccq/quant-calculator').MovingTriggerPrice;
const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let okPrices = { ask: null, bid: null };
let mtp = null;
let longshort = null;
let price = null;
let cont = 1;

const syncOkex = () => {
  const futuresInstrumentId = `${COIN_NAME}-USD-${DATE.OKEx}`;

  const futuresOkex = new FuturesOkex(futuresInstrumentId, configOkex);
  futuresOkex.subscribe();

  futuresOkex.on('orderbook5', () => {
    // console.log('Ask %j Bid %j', futuresOkex.orderbook5.asks[0], futuresOkex.orderbook5.bids[0]);
    okPrices = futuresOkex.getAsk1Bid1(LEVEL);
  });
};
syncOkex();

setInterval(() => {
  if (!okPrices.ask || !okPrices.bid) return;

  const ask1 = parseFloat(okPrices.ask[0]); // 盘口买卖价格
  const bid1 = parseFloat(okPrices.bid[0]);
  const middlePrice = (ask1 + bid1) / 2; // 盘口中间价

  if (!mtp) {
    longshort = Math.random() > 0.5; // 随机一个买卖方向测试
    price = longshort ? ask1 : bid1; // 做多以买一价开仓, 做空以买一价开仓.

    mtp = new MovingTriggerPrice(longshort, leverage, FEE, closeRatio, slippage, decimal);

    // TODO 调用开仓记录
    console.log('开[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
    mtp.addCont(cont, price); // 记录开仓

    mtp.on('onContChange', () => {
      console.log('cont changed, %s', mtp.holdCont);
    });

    mtp.on('onPriceChange', () => {
      console.log('price changed %s', mtp.currPrice);
    });

    mtp.on('onClosePriceMove', () => {
      console.log('price changed: close %s, trigger %s, move %s', mtp.closePrice, mtp.triggerPrice, mtp.movePrice);
    });

    mtp.on('onCloseLong', () => {
      // TODO 调用平多接口
      console.log('平[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', mtp.currPrice, cont);
    });
    mtp.on('onCloseShort', () => {
      // TODO 调用平空接口
      console.log('平[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', mtp.currPrice, cont);
    });
  }

  mtp.onPriceChange(middlePrice); // 价格变动后, 计算
  // mtp.calcProfitRatio(); // 计算收益率
}, 1e3);
