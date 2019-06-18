// 做哪个交易区, 哪种合约
const COIN_NAME = 'ETH';
const DATE = {
  OKEx: '190628',
  HuoBi: 'NW', // CW current week, NW next week, CQ current quarter
};
const LEVEL = 2; // 取 Level 几进行判断
const FEE = '0.0003'; // 手续费率

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
  secret: '4',
  wskey: '',
  wssecret: '',
  passphrase: '',
  urlHost: 'https://api.hbdm.com',
  websocekHost: 'wss://www.hbdm.com/ws',
};

module.exports = {
  COIN_NAME, DATE, LEVEL, FEE, configHuobi, configOkex,
}
