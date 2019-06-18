const BN = require('bignumber.js');
const MovingTriggerPrice = require('@bccq/quant-calculator').MovingTriggerPrice;
const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('./strategy_config');

let okPrices = { ask: null, bid: null };
let mtp = null;
let longshort = null;
let price = null;
let cont = 100;

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

  const okPrice = [new BN(okPrices.ask[0]), new BN(okPrices.bid[0])];
  const middlePrice = okPrice[0].plus(okPrice[1]).div(2);

  if (!mtp) {
    longshort = Math.random() > 0.5;
    price = longshort ? okPrice[0] : okPrice[1];

    mtp = new MovingTriggerPrice(longshort, leverage, FEE, closeRatio, slippage, decimal);
    mtp.addCont(cont, price);
  }
  mtp.onPriceChange(middlePrice);
  mtp.calcProfitRatio();
}, 1e3);
