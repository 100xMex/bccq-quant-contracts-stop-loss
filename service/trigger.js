const EventEmitter = require('events').EventEmitter;
const MovingTriggerPrice = require('@bccq/quant-calculator').MovingTriggerPrice;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let mt = null;

class MovingTrigger extends EventEmitter {
  constructor() {
    super();

    this.mtp = null;
  }

  __addListener() {
    this.mtp.on('onPriceChange', () => {
      console.log(
        'price changed 当前价 %s, 做[%s] %s 张, 持仓价 %s, 平仓价 %s=>%s, 当前[%s] %s, 移仓价 %s, 未实现收益率 %s',
        this.mtp.currPrice, this.mtp.longshort > 0 ? '多' : '空',
        this.mtp.holdCont, this.mtp.holdPrice, this.mtp.triggerPrice, this.mtp.closePrice,
        this.mtp.longshort > 0 ? '下轨' : '上轨', this.mtp.longshort > 0 ? this.mtp.lowerPrice : this.mtp.upperPrice,
        this.mtp.movePrice, this.mtp.pnlRatio,
      );
      // this.emit('persistence', 'price changed');
    });

    this.mtp.on('onContChange', () => {
      // TODO 写入本地/数据库
      console.log('cont changed, 仓位 %s, 均价 %s', this.mtp.holdCont, this.mtp.holdPrice);
      this.emit('persistence', 'cont changed');
    });

    this.mtp.on('onClosePriceMove', () => {
      // TODO 写入本地/数据库
      console.log(
        'price moved: 平仓价 %s, 触发价 %s, 移仓价 %s',
        this.mtp.closePrice, this.mtp.triggerPrice, this.mtp.movePrice
      );
      this.emit('persistence', 'price move');
    });

    this.mtp.on('onCloseLong', () => {
      // TODO 调用平多接口
      console.log(
        'close long: 平[%s]仓, 当前价 %s, 触发价 %s, 平仓价 %s, 张数 %s, 盈亏 %s',
        this.mtp.longshort ? '多' : '空',
        this.mtp.currPrice, this.mtp.triggerPrice, this.mtp.closePrice, this.mtp.holdCont, this.mtp.pnlRatio,
      );
      this.emit('persistence', 'close long');
    });

    this.mtp.on('onCloseShort', () => {
      // TODO 调用平空接口
      console.log(
        'close long: 平[%s]仓, 当前价 %s, 触发价 %s, 平仓价 %s, 张数 %s, 盈亏 %s',
        this.mtp.longshort ? '多' : '空',
        this.mtp.currPrice, this.mtp.triggerPrice, this.mtp.closePrice, this.mtp.holdCont, this.mtp.pnlRatio,
      );
      this.emit('persistence', 'close short');
    });

    return this.mtp;
  }

  loadMtp() { return this.mtp; }

  createMtp() {
    this.mtp = new MovingTriggerPrice().init(0, leverage, FEE, closeRatio, slippage, decimal);
    this.__addListener(this.mtp);

    return this.mtp;
  }

  restoreMtp(json) {
    this.mtp = new MovingTriggerPrice().fromJson(json);
    this.__addListener(this.mtp);

    if (this.mtp.holdCont === 0) this.reset();

    return this.mtp;
  }

  updatePrice(okPrices) {
    if (!okPrices.ask || !okPrices.bid || !this.mtp || this.mtp.holdCont === 0) return;

    const ask1 = parseFloat(okPrices.ask[0]); // 盘口买卖价格
    const bid1 = parseFloat(okPrices.bid[0]);
    const middlePrice = (ask1 + bid1) / 2; // 盘口中间价

    this.mtp.onPriceChange(middlePrice); // 价格变动后, 计算
    // this.mtp.calcProfitRatio(); // 计算收益率
  };

  addCont(longshort, price, cont) {
    if (!this.mtp) {
      this.mtp = this.createMtp();
    }

    if (this.mtp.holdCont === 0) {
      this.mtp.longshort = longshort;
      // TODO 调用开仓记录, 成功返回后以返回价格, 张数向下继续
      console.log('开[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
      this.mtp.addCont(cont, price);
    }
    else if (this.mtp.longshort === longshort) {
      // TODO 调用开仓记录, 成功返回后以返回价格, 张数向下继续
      console.log('开[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
      this.mtp.addCont(cont, price);
    }
    else {
      console.log('与当前持仓方向不一致.');
    }

    return true;
  }

  subCont(longshort, price, cont) {
    if (!this.mtp) return false;

    if (this.mtp.longshort !== longshort || this.mtp.holdCount < cont) return;

    // TODO 调用平仓记录, 成功返回后以返回价格, 张数向下继续
    console.log('平[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
    this.mtp.subCont(cont, price);

    if (this.mtp.holdCont === 0) this.reset();
  }

  reset() {
    if (this.mtp.holdCont !== 0) return;

    this.mtp = this.createMtp();
    this.emit('persistence', 'reset');
  }
}

// {
//   createMtp,
//   restoreMtp,
//   loadMtp: () => this.mtp,
//   addCont,
//   subCont,
//   updatePrice,
// }

module.exports = {
  getInstance: () => {
    if (!mt) {
      mt = new MovingTrigger();
    }

    return mt;
  }
}
