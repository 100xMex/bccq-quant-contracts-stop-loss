
const configOkex = {
  key: '',
  secret: '',
  wskey: '',
  wssecret: '',
  passphrase: '',
  urlHost: 'https://www.okex.com',
  websocekHost: 'wss://real.okex.com:10442/ws/v3',
};

const configHuobi = {
  key: '',
  secret: '',
  wskey: '',
  wssecret: '',
  passphrase: '',
  urlHost: 'https://api.hbdm.com',
  websocekHost: 'wss://www.hbdm.com/ws',
};

const COIN_NAME = 'ETH'; // 做哪个交易区, 哪种合约
const DATE = {
  OKEx: '190628',
  HuoBi: 'NW', // CW current week, NW next week, CQ current quarter
};
const LEVEL = 2; // 取 Level 几进行判断
const FEE = 0.0003; // 手续费率 - 考虑杠杆和开平仓手续费, 上来就会亏损 1.2% 左右

const slippage = 0.0005; // 平仓价格滑点
const leverage = 20; // 杠杆率
const decimal = 0.001; // 精度
const closeRatio = 0.03; // 止损阈值

module.exports = {
  COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex,
  slippage, leverage, decimal, closeRatio
}
