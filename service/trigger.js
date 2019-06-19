const BN = require('bignumber.js');
const MovingTriggerPrice = require('@bccq/quant-calculator').MovingTriggerPrice;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let mtp = null;

// 开仓
const openOrderRequest = () => { };
// 平仓
const closeOrderRequest = () => { };
// 设置止盈止损单
const openTriggerRequest = () => { };
// 取消止盈止损单
const closeTriggerRequest = () => { };

const createMtp = (longshort, price, cont) => {
  mtp = new MovingTriggerPrice(longshort, leverage, FEE, closeRatio, slippage, decimal);

  // TODO 调用开仓记录, 成功返回后以返回价格, 张数向下继续
  console.log('开[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
  mtp.addCont(cont, price); // 记录开仓

  mtp.on('onPriceChange', () => {
    console.log(
      'price changed 当前价 %s, 做[%s] %s 张, 持仓价 %s, 平仓价 %s=>%s, 当前[%s] %s, 移仓价 %s, 未实现收益率 %s',
      mtp.currPrice, longshort > 0 ? '多' : '空',
      mtp.holdCont, mtp.holdPrice, mtp.triggerPrice, mtp.closePrice,
      longshort > 0 ? '下轨' : '上轨', longshort > 0 ? mtp.lowerPrice : mtp.upperPrice,
      mtp.movePrice, mtp.pnlRatio,
    );
  });

  mtp.on('onContChange', () => {
    // TODO 写入本地/数据库
    console.log('cont changed, 仓位 %s, 均价 %s', mtp.holdCont, mtp.holdPrice);
  });

  mtp.on('onClosePriceMove', () => {
    // TODO 写入本地/数据库
    console.log(
      'price moved: 平仓价 %s, 触发价 %s, 移仓价 %s',
      mtp.closePrice, mtp.triggerPrice, mtp.movePrice
    );
  });

  mtp.on('onCloseLong', () => {
    // TODO 调用平多接口
    console.log(
      'close long: 平[%s]仓, 当前价 %s, 触发价 %s, 平仓价 %s, 张数 %s, 盈亏 %s',
      longshort ? '多' : '空',
      mtp.currPrice, mtp.triggerPrice, mtp.closePrice, cont, mtp.pnlRatio,
    );
  });
  mtp.on('onCloseShort', () => {
    // TODO 调用平空接口
    console.log(
      'close long: 平[%s]仓, 当前价 %s, 触发价 %s, 平仓价 %s, 张数 %s, 盈亏 %s',
      longshort ? '多' : '空',
      mtp.currPrice, mtp.triggerPrice, mtp.closePrice, cont, mtp.pnlRatio,
    );
  });

  return mtp;
}

const updatePrice = (okPrices) => {
  if (!okPrices.ask || !okPrices.bid || !mtp || mtp.holdCont === 0) return;

  const ask1 = parseFloat(okPrices.ask[0]); // 盘口买卖价格
  const bid1 = parseFloat(okPrices.bid[0]);
  const middlePrice = (ask1 + bid1) / 2; // 盘口中间价

  mtp.onPriceChange(middlePrice); // 价格变动后, 计算
  // mtp.calcProfitRatio(); // 计算收益率
};

const addCont = (longshort, price, cont) => {
  if (!mtp) {
    mtp = createMtp(longshort, price, cont);
    return true;
  }

  if (mtp.cont === 0) {
    mtp.longshort = longshort;
    mtp.addCont(cont, price);
  }
  else if (mtp.longshort === longshort) {
    mtp.addCont(cont, price);
  }
  else {
    console.log('与当前持仓方向不一致.');
  }
}

const subCont = (longshort, price, cont) => {
  if (!mtp) return false;

  if (mtp.longshort !== longshort || mtp.holdCount < cont) return;

  mtp.subCont(cont, price);
}

module.exports = {
  addCont,
  subCont,
  updatePrice,
};
