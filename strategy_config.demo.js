const slippage = 0.0005; // 平仓价格滑点

const leverage = 20; // 杠杆率
const fee = 0.0003; // 手续费率 - 考虑杠杆和开平仓手续费, 上来就会亏损 1.2% 左右
const decimal = 0.001; // 精度
const closeRatio = 0.03; // 止损阈值

module.exports = {
  slippage, leverage, fee, decimal, closeRatio
};