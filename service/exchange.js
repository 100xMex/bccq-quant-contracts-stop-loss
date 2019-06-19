const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let okPrices = { ask: null, bid: null, updated: 0 };

module.exports = {
  start: () => {
    const futuresInstrumentId = `${COIN_NAME}-USD-${DATE.OKEx}`;

    const futuresOkex = new FuturesOkex(futuresInstrumentId, configOkex);
    futuresOkex.subscribe();

    futuresOkex.on('orderbook5', () => {
      // console.log('Ask %j Bid %j', futuresOkex.orderbook5.asks[0], futuresOkex.orderbook5.bids[0]);
      okPrices = futuresOkex.getAsk1Bid1(LEVEL);
      okPrices.updated = Date.now();
    });
  },
  getPrices: () => okPrices,
};
