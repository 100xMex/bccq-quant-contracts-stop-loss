const FuturesOkex = require('@bccq/wss-futures').FuturesOkex;

const { COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex, slippage, leverage, decimal, closeRatio } = require('../config/strategy_config');

let futuresIns = null;

class FuturesManager {
  constructor() {
    this.futuresOkex = null;

    this.coinName = COIN_NAME;
    this.futuresInstrumentId = `${COIN_NAME}-USD-${DATE.OKEx}`;

    this.okPrices = { ask: null, bid: null, updated: 0 };
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

  // 杠杆
  async getLeverage() {
    const currLeverage = await this.futuresOkex.authClient.futures().getLeverage(COIN_NAME);
    console.log('当前 %s Leverage %j', COIN_NAME, currLeverage);

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
    console.log('设置 %s Leverage %j', COIN_NAME, currLeverage);
  }

  // 获取当前仓位
  async loadPosition() {
    const info = await this.futuresOkex.authClient.futures().getPosition(this.futuresInstrumentId);
    // console.log('Position %j', info);

    if (!info.result) return null;

    const positions = info.holding;
    const position = positions.filter(pos => pos.instrument_id === this.futuresInstrumentId);

    // { long_qty: '0',
    // long_avail_qty: '0',
    // long_margin: '0',
    // long_liqui_price: '0',
    // long_pnl_ratio: '0',
    // long_avg_cost: '0',
    // long_settlement_price: '0',
    // realised_pnl: '0',
    // short_qty: '0',
    // short_avail_qty: '0',
    // short_margin: '0',
    // short_liqui_price: '0',
    // short_pnl_ratio: '0',
    // short_avg_cost: '0',
    // short_settlement_price: '0',
    // instrument_id: 'ETH-USD-190927',
    // long_leverage: '10',
    // short_leverage: '10',
    // created_at: '1970-01-01T00:00:00.000Z',
    // updated_at: '1970-01-01T00:00:00.000Z',
    // margin_mode: 'fixed',
    // short_margin_ratio: null,
    // short_maint_margin_ratio: null,
    // short_pnl: null,
    // short_unrealised_pnl: null,
    // long_margin_ratio: null,
    // long_maint_margin_ratio: null,
    // long_pnl: null,
    // long_unrealised_pnl: null }
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

  // 开仓 - 要返回是否成功, 均价, 张数
  async openOrder(longshort, cont, price) {
    const params = {
      instrument_id: this.futuresInstrumentId,
      type: longshort > 0 ? 1 : 2, // 1:开多 2:开空
      order_type: 3, // 0：普通委托（order type不填或填0都是普通委托） 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC）
      price,
      size: cont,
      leverage: this.leverage
    };
    const info = await this.futuresOkex.authClient.futures().postOrder(params);
    if (!info.result) return false;

    return info.order_id;
  }
  // 平仓 - 要返回是否成功, 均价, 张数
  async closeOrder(longshort, cont, price) {
    const params = {
      instrument_id: this.futuresInstrumentId,
      type: longshort > 0 ? 3 : 4, // 3:平多 4:平空
      order_type: 3, // 0：普通委托（order type不填或填0都是普通委托） 1：只做Maker（Post only） 2：全部成交或立即取消（FOK） 3：立即成交并取消剩余（IOC）
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
  async cancelBatchOrders(orderIds) {
    const info = await this.futuresOkex.authClient.futures().cancelBatchOrders(this.futuresInstrumentId, { order_ids: orderIds });
    if (!info.result) return false;

    return info.order_ids;
  }
  async closeAllPosition(direction) {
    // /api/futures/v3/close_position
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
    console.log('%s Orders %j', state, orders);

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

// module.exports = {
//   getFutures: () => futuresOkex ? futuresOkex : startService(),
//   getPrices: () => okPrices,
//   openOrder, closeOrder, openTrigger, closeTrigger, loadPos, loadOrders, loadTrigger
// };

futuresIns = new FuturesManager().init();
// 杠杆
// futuresIns.getLeverage();
// futuresIns.setLeverage(20);
// 持仓
// futuresIns.loadPosition();
// 账户
// futuresIns.loadAccount();

// futuresIns.loadLedger();
// futuresIns.loadOrder('3034003209468929');
futuresIns.loadOrders(-2);
futuresIns.loadOrders(-1);
futuresIns.loadOrders(0);
futuresIns.loadOrders(1);
futuresIns.loadOrders(2);
futuresIns.loadOrders(3);
futuresIns.loadOrders(4);
futuresIns.loadOrders(6);
futuresIns.loadOrders(7);

