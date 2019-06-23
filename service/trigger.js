const EventEmitter = require('events').EventEmitter;
const MovingTriggerPrice = require('@bccq/quant-calculator').MovingTriggerPrice;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let mt = null;

class MovingTrigger extends EventEmitter {
  constructor() {
    super();

    this.mtp = null;
    this.exchange = null;
  }

  init(exchange) {
    this.exchange = exchange;
    this.__addExListener();

    return this;
  }

  __addExListener() {
    this.exchange.getExchange().on('position', (position) => {
      // console.log('recv position info %j', position);
    });
    this.exchange.getExchange().on('account', (account) => {
      // console.log('recv account info %j', account);
    });
    this.exchange.getExchange().on('order', (order) => {
      // console.log('recv order info %j', order);

      if (order.status === "-2") {
        console.log('下单失败 %j', order);
        return;
      }

      if (order.status === "-1" && order.filled_qty === '0') {
        console.log('下单未及时成交, 撤单 %j', order);
        return;
      }

      if (order.status === "0") {
        console.log('下单成功 %j', order);
        return;
      }

      if (order.status === "-1") {
        console.log('下单部分成交, 剩余撤单 %j', order);
      }
      if (order.status === "2") {
        console.log('下单全部成交, %j', order);
      }

      console.log('成交信息 %j', {
        "filled_qty": order.filled_qty,
        "fee": order.fee,
        "price_avg": order.price_avg,
        "type": order.type,
        "last_fill_qty": order.last_fill_qty,
        "last_fill_px": order.last_fill_px,
        "size": order.size,
        "system_type": order.system_type,
        "price": order.price,
        "state": order.state,
        "contract_val": order.contract_val,
        "order_id": order.order_id,
        "order_type": order.order_type,
        "status": order.status
      });

      let type = null;
      const cont = parseInt(order.filled_qty, 10);
      const price = parseFloat(order.price_avg);
      switch (order.type) {
        case "1":
          type = "开多";
          this.onAddCont(1, cont, price);
          break;
        case "2":
          type = "开空";
          this.onAddCont(-1, cont, price);
          break;
        case "3":
          type = "平多";
          this.onSubCont(1, cont, price);
          break;
        case "4":
          type = "平空";
          this.onSubCont(-1, cont, price);
          break;
        default: break;
      }

      console.log('%s %s张 均价 %s ', type, order.filled_qty, order.price_avg);


    });

    return this.exchange;
  }

  __addMtpListener() {
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
    this.__addMtpListener();

    return this.mtp;
  }

  restoreMtp(json) {
    this.mtp = new MovingTriggerPrice().fromJson(json);
    this.__addMtpListener();

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

  async addCont(longshort, cont, price) {
    if (!this.mtp) {
      this.mtp = this.createMtp();
    }

    if (this.mtp.holdCont === 0 || this.mtp.longshort === longshort) {
      // TODO 调用开仓记录, 成功返回后以返回价格, 张数向下继续
      const orderId = await this.exchange.openOrder(longshort, cont, price);
      console.log('Open OrderId %s', orderId);
      return orderId;
    }

    console.log('与当前持仓方向不一致.');
    return false;
  }

  onAddCont(longshort, cont, price) {
    if (this.mtp.holdCont === 0) this.mtp.longshort = longshort;

    console.log('开[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
    this.mtp.addCont(cont, price);
  }

  async subCont(longshort, cont, price) {
    if (!this.mtp) return false;

    if (this.mtp.longshort !== longshort || this.mtp.holdCount < cont) return;

    // TODO 调用平仓记录, 成功返回后以返回价格, 张数向下继续
    const orderId = await this.exchange.closeOrder(longshort, cont, price);
    console.log('Close OrderId %s', orderId);

    if (this.mtp.holdCont === 0) this.reset();
  }

  onSubCont(longshort, cont, price) {
    console.log('平[%s]仓, 价格 %s, 张数 %s', longshort ? '多' : '空', price, cont);
    this.mtp.subCont(cont, price);
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
