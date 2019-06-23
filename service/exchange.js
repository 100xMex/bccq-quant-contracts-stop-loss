const Async = require('async');
const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let futuresIns = null;

class FuturesManager {
  constructor() {
    this.futuresOkex = null;

    this.coinName = COIN_NAME;
    this.futuresInstrumentId = `${COIN_NAME}-USD-${DATE.OKEx}`;

    this.okPrices = { ask: null, bid: null, updated: 0 };
    this.leverage = leverage;
  }

  init() {
    this.futuresOkex = new FuturesOkex(this.futuresInstrumentId, configOkex);
    this.futuresOkex.subscribe();

    this.futuresOkex.on('orderbook5', () => {
      // console.log('Ask %j Bid %j', futuresOkex.orderbook5.asks[0], futuresOkex.orderbook5.bids[0]);
      // console.log('Bid %j', futuresOkex.orderbook5.bids[0]);
      // console.log('Ask %j', futuresOkex.orderbook5.asks[0]);
      this.okPrices = this.futuresOkex.getAsk1Bid1(LEVEL);
      this.okPrices.updated = Date.now();
    });

    return this;
  }

  getPrices() {
    return this.okPrices;
  }

  // 杠杆
  async getLeverage() {
    const currLeverage = await this.futuresOkex.authClient.futures().getLeverage(COIN_NAME);
    // console.log('当前 %s Leverage %j', COIN_NAME, currLeverage);

    // {
    //   "margin_mode": "fixed",
    //   "ETH-USD-190927": { "long_leverage": "10", "short_leverage": "10" },
    //   "ETH-USD-190621": { "long_leverage": "10", "short_leverage": "10" },
    //   "ETH-USD-190628": { "long_leverage": "10", "short_leverage": "10" }
    // }
    return currLeverage;
  }
  async setLeverage() {
    await this.futuresOkex.authClient.futures().postLeverage(COIN_NAME, { instrument_id: this.futuresInstrumentId, leverage });
    const currLeverage = await this.getLeverage();
    // console.log('设置 %s Leverage %j', COIN_NAME, currLeverage);
  }

  // 获取当前仓位
  async loadPosition() {
    const info = await this.futuresOkex.authClient.futures().getPosition(this.futuresInstrumentId);
    // console.log('Position %j', info);

    if (!info.result) return null;

    const positions = info.holding;
    const position = positions.filter(pos => pos.instrument_id === this.futuresInstrumentId);

    // {
    //   "instrument_id": "ETH-USD-190927",
    //   "liquidation_price": "125.926",
    //   "leverage": "20",
    //
    //   "realised_pnl": "0.000065",
    //   "margin_mode": "crossed",
    //   "created_at": "2019-06-20T11:46:54.000Z",
    //   "updated_at": "2019-06-22T12:21:52.000Z",
    //
    //   "long_qty": "2",
    //   "long_avail_qty": "2",
    //   "long_avg_cost": "330.11485054",
    //   "long_settlement_price": "330.11485054",
    //
    //   "long_margin": "0.00302761",
    //   "long_pnl": "3.287E-5",
    //   "long_pnl_ratio": "0.010827767097712",
    //   "long_unrealised_pnl": "3.287E-5",
    //
    //   "short_qty": "0",
    //   "short_avail_qty": "0",
    //   "short_avg_cost": "0",
    //   "short_settlement_price": "0",
    //
    //   "short_margin": "0.0",
    //   "short_pnl": "0.0",
    //   "short_pnl_ratio": "0.0",
    //   "short_unrealised_pnl": "0.0"
    // }
    return position.length === 1 ? position[0] : null;
  }
  // 获取仓位信息
  async loadAccount() {
    const info = await this.futuresOkex.authClient.futures().getAccounts(COIN_NAME);
    // console.log('Account %j', info);

    // { total_avail_balance: '0.1',
    // contracts: null,
    // equity: '0.1',
    // margin_mode: 'fixed',
    // auto_margin: '0',
    // liqui_mode: 'tier' }
    return info;
  }

  // 平仓
  async closeAllPosition(longshort) {
    // /api/futures/v3/close_position
  }
  // 下开仓单 - 要返回是否成功, 均价, 张数
  async openOrder(longshort, cont, price) {
    const params = {
      instrument_id: this.futuresInstrumentId,
      type: longshort > 0 ? 1 : 2, // 1:开多 2:开空
      order_type: 0, // 0：普通委托（order type不填或填0都是普通委托） 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC）
      price,
      size: cont,
      leverage: this.leverage
    };
    const info = await this.futuresOkex.authClient.futures().postOrder(params);
    if (!info.result) return false;

    return info.order_id;
  }
  // 下平仓单 - 要返回是否成功, 均价, 张数
  async closeOrder(longshort, cont, price) {
    const params = {
      instrument_id: this.futuresInstrumentId,
      type: longshort > 0 ? 3 : 4, // 3:平多 4:平空
      order_type: 0, // 0：普通委托（order type不填或填0都是普通委托） 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC）
      price,
      size: cont,
      leverage: this.leverage
    };
    const info = await this.futuresOkex.authClient.futures().postOrder(params);
    if (!info.result) return false;

    return info.order_id;
  }
  // 撤单
  async cancelOrder(orderId) {
    const info = await this.futuresOkex.authClient.futures().cancelOrder(this.futuresInstrumentId, orderId);
    if (!info.result) return false;

    return info.order_id;
  }
  // 批量撤单
  async cancelBatchOrders(orderIds) {
    const info = await this.futuresOkex.authClient.futures().cancelBatchOrders(this.futuresInstrumentId, { order_ids: orderIds });
    if (!info.result) return false;

    return info.order_ids;
  }
  async cancelAllOrders() {
    // /api/futures/v3/cancel_all
  }

  // 某个订单信息
  async loadOrder(orderId) {
    const info = await this.futuresOkex.authClient.futures().getOrder(this.futuresInstrumentId, orderId);
    // console.log(info);

    // { instrument_id: 'ETH-USD-190927',
    // size: '1',
    // timestamp: '2019-06-20T11:46:54.000Z',
    // filled_qty: '1',
    // fee: '-0.00001795',
    // order_id: '3034003209468929',
    // price: '278.6',
    // price_avg: '278.596',
    // status: '2',
    // state: '2',
    // type: '1',
    // contract_val: '10',
    // leverage: '20',
    // client_oid: '',
    // pnl: '0',
    // order_type: '0' }

    return info;
  }
  // 获取当前挂单
  async loadOrders(state, limit = 10, from = null, to = null) {
    // "-2":失败,
    // "-1":撤单成功,
    // "0":等待成交,
    // "1":部分成交,
    // "2":完全成交,
    // "3":下单中,
    // "4":撤单中,

    // "6":未完成(等待成交+部分成交)
    // "7":已完成(撤单成功+完全成交)

    const params = { state, limit, from, to };
    const info = await this.futuresOkex.authClient.futures().getOrders(this.futuresInstrumentId, params);
    if (!info.result) return [];

    // { result: true,
    // order_info:
    // [ { instrument_id: 'ETH-USD-190927',
    //   size: '1',
    //   timestamp: '2019-06-20T11:46:54.000Z',
    //   filled_qty: '1',
    //   fee: '-0.00001795',
    //   order_id: '3034003209468929',
    //   price: '278.6',
    //   price_avg: '278.596',
    //   status: '2',
    //   state: '2',
    //   type: '1',
    //   contract_val: '10',
    //   leverage: '20',
    //   client_oid: '',
    //   pnl: '0',
    //   order_type: '0' } ] }
    const orders = info.order_info;

    // console.log('%s Orders %j', state, orders);

    return orders;
  }

  // 成交明细
  async loadFills(orderId) {
    const info = await this.futuresOkex.authClient.futures().getFills({ instrument_id: this.futuresInstrumentId, order_id: orderId });
    if (!info.result) return null;

    return info;
  }
  async getHolds() {
    const info = await this.futuresOkex.authClient.futures().getHolds(this.futuresInstrumentId);

    return info;
  }

  // 获取下单流水
  async loadLedger(limit = 10, from = null, to = null) {
    const params = { limit, from, to };
    const info = await this.futuresOkex.authClient.futures().getAccountsLedger(COIN_NAME, params);
    // console.log('Ledger %j', info);

    // [{
    //   "ledger_id": "3034003211517955",
    //   "timestamp": "2019-06-20T11:46:55.000Z",
    //   "amount": "-0.00001795",
    //   "balance": "0",
    //   "currency": "ETH",
    //   "type": "fee",
    //   "details": { "order_id": "3034003209468929", "instrument_id": "ETH-USD-190927" }
    // },
    // {
    //   "ledger_id": "3034003211517954",
    //   "timestamp": "2019-06-20T11:46:55.000Z",
    //   "amount": "0",
    //   "balance": "1",
    //   "currency": "ETH",
    //   "type": "match",
    //   "details": { "order_id": "3034003209468929", "instrument_id": "ETH-USD-190927" }
    // },
    // {
    //   "ledger_id": "3033476618558464",
    //   "timestamp": "2019-06-20T09:32:59.000Z",
    //   "amount": "0.1",
    //   "balance": "0",
    //   "currency": "ETH",
    //   "type": "transfer",
    //   "details": { "order_id": "3033476618492928", "instrument_id": null }
    // }]
    return info;
  }
}

module.exports = {
  getInstance: () => {
    if (!futuresIns) {
      futuresIns = new FuturesManager();
    }

    return futuresIns;
  }
}

// 获取仓位, 平仓接口
// Async.waterfall([
//   (next) => {
//     futuresIns = new FuturesManager().init();
//     next();
//   },
//   (next) => {
//     futuresIns.loadPosition().then(data => {
//       console.log('position %j', data);
//       next(null, data);
//     });
//   },
//   (orderId, next) => {
//     futuresIns.closeOrder(1, 1, 330).then(data => {
//       console.log('order %j', data);
//       next(null, orderId);
//     });
//   },
// ], (next) => {
// });



// 下单, 取消接口
// Async.waterfall([
//   (next) => {
//     futuresIns = new FuturesManager().init();
//     next();
//   },
//   (next) => {
//     futuresIns.openOrder(1, 1, 300).then(orderId => {
//       console.log('open order %j', orderId);
//       next(null, orderId);
//       // TODO 通过监听 wss 获知订单信息
//     });
//   },
//   (orderId, next) => {
//     futuresIns.loadOrder(orderId).then(data => {
//       console.log('order %j', data);
//       next(null, orderId);
//     });
//   },
//   (orderId, next) => {
//     futuresIns.cancelOrder(orderId).then(data => {
//       console.log('cancel order %j', data);
//       next();
//       // TODO 通过监听 wss 获知订单信息
//     });
//   },
// ], (next) => {
//   const states = [-2, -1, 0, 1, 2, 3, 4, 6, 7];
//   states.forEach(state => {
//     futuresIns.loadOrders(state).then(data => {
//       console.log('%s orders %j', state, data);
//     });
//   });
// });



// 全部的读取接口
// Async.waterfall([
//   (next) => {
//     futuresIns = new FuturesManager().init();
//     next();
//   },
//   (next) => {
//     futuresIns.getLeverage().then(data => {
//       console.log('leverage %j', data);
//       next();
//     });
//   },
//   (next) => {
//     futuresIns.loadPosition().then(data => {
//       console.log('position %j', data);
//       next();
//     });
//   },
//   (next) => {
//     futuresIns.loadAccount().then(data => {
//       console.log('account %j', data);
//       next();
//     });
//   },
//   (next) => {
//     futuresIns.loadLedger().then(data => {
//       console.log('ledger %j', data);
//       next();
//     });
//   },
//   (next) => {
//     futuresIns.loadOrder('3034003209468929').then(data => {
//       console.log('order %j', data);
//       next();
//     });
//   },
//   (next) => {
//     // 一直返回 null 不知道怎么用
//     futuresIns.loadFills('3034003209468929').then(data => {
//       console.log('fills %j', data);
//       next();
//     });
//   },
//   (next) => {
//     // 值一直未 0, 估计不是持仓量
//     futuresIns.getHolds().then(data => {
//       console.log('holds %j', data);
//       next();
//     });
//   },
//   // (next) => { },
// ], (next) => {
//   const states = [-2, -1, 0, 1, 2, 3, 4, 6, 7];
//   states.forEach(state => {
//     futuresIns.loadOrders(state).then(data => {
//       console.log('%s orders %j', state, data);
//     });
//   });
// });

