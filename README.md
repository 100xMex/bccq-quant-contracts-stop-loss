# 配合手动交易的移动止损机制

目的: 传统止盈止损, 经常出现下跌时亏的多, 暴涨时赚的少的问题.

移动止盈止损, 目的就是只止损, 不止盈. 使用移动的止损价格, 代替止盈价格.

BugList:

1. (完成) 网络抖动 - 监听断开后, 退出使用 pm2 自动重启 >> 必须搭配完备的数据落地, 以及使用官方的止盈止损单(防止程序出问题) - 官方无止盈止损单接口.
2. (完成) 程序崩溃后的数据恢复
3. 开仓, 平仓(是否自己手动平, 还是创建系统止盈止损点)
4. (完成) 加仓/平仓后, 使用接口再开仓失败
5. (完成) 增加全面的日志
6. TODO 止损价移动方案

> 1. 现在是根据 movePrice 与上/下轨的比较大小, 判断是否移仓价
> 2. 以实时价格计算上/下轨, 不与 movePrice 比较, 直接更新 triggerPrice
> 3. 以实时价格不计算上下轨, 直接与 movePrice 比较, 更新 triggerPrice
> 4. 移仓价以分钟收盘价计算, 平仓价实时计算
> 5. 移仓价: 赚 10%的时候, 移到赚 2%; 赚 30%的时候移到 3%, ..  赚 100%的时候移到 90%, 赚 200%的时候移到 180% ..
     目的是开始移动的少, 为了防止回撤, 接近 100% 的时候主键开始移动多, 稳住收益; 超过 100% 又移动的少... 这个策略不容易实现.
     主要思路就是一分钟拉锯比较大时候, 一不小心就平仓了.

7. (完成) 界面操作
8. TODO 程序出买卖信号(取代随机买卖方向)



## OKEx 开仓日志

```text

==== 开仓下单一刻

recv position info {"long_qty":"0","long_avail_qty":"0","long_avg_cost":"278.596","long_settlement_price":"278.596","realised_pnl":"0","short_qty":"0","short_avail_qty":"0","short_avg_cost":"0","short_settlement_price":"0","liquidation_price":"0.0","instrument_id":"ETH-USD-190927","leverage":"20","created_at":"2019-06-20T11:46:54.000Z","updated_at":"2019-06-22T11:51:27.000Z","margin_mode":"crossed","short_margin":"0.0","short_pnl":"0.0","short_pnl_ratio":"0.0","short_unrealised_pnl":"0.0","long_margin":"0.0","long_pnl":"0.0","long_pnl_ratio":"3.0061065592","long_unrealised_pnl":"0.0","long_open_outstanding":"1","short_open_outstanding":"0"}

recv account info {"ETH":{"available":"0.0985414","available_balance":"0.0985414","equity":"0.1000659","liqui_mode":"tier","maint_margin_ratio":"0.01","margin":"0.0015245","margin_for_unfilled":"0.0015245","margin_frozen":"0","margin_mode":"crossed","margin_ratio":"3.28192522","open_max":"64","realized_pnl":"0","total_avail_balance":"0.1000659","unrealized_pnl":"0"}}

recv order info {"leverage":"20","last_fill_time":"1970-01-01T00:00:00.000Z","filled_qty":"0","fee":"0","price_avg":"0.0","type":"1","client_oid":"","last_fill_qty":"0","instrument_id":"ETH-USD-190927","last_fill_px":"0","size":"1","system_type":0,"price":"327.977","state":"0","contract_val":"10","order_id":"3045345706978304","order_type":"0","timestamp":"2019-06-22T11:51:27.000Z","status":"0"}

==== 开仓成交一刻

recv order info {"leverage":"20","last_fill_time":"2019-06-22T11:51:27.837Z","filled_qty":"1","fee":"-0.00001524","price_avg":"327.977","type":"1","client_oid":"","last_fill_qty":"1","instrument_id":"ETH-USD-190927","last_fill_px":"327.977","size":"1","system_type":0,"price":"327.977","state":"2","contract_val":"10","order_id":"3045345706978304","order_type":"0","timestamp":"2019-06-22T11:51:27.000Z","status":"2"}

recv position info {"long_qty":"1","long_avail_qty":"1","long_avg_cost":"327.977","long_settlement_price":"327.977","realised_pnl":"-0.00001524","short_qty":"0","short_avail_qty":"0","short_avg_cost":"0","short_settlement_price":"0","liquidation_price":"77.371","instrument_id":"ETH-USD-190927","leverage":"20","created_at":"2019-06-20T11:46:54.000Z","updated_at":"2019-06-22T11:51:27.000Z","margin_mode":"crossed","short_margin":"0.0","short_pnl":"0.0","short_pnl_ratio":"0.0","short_unrealised_pnl":"0.0","long_margin":"0.00152495","long_pnl":"-9.12E-6","long_pnl_ratio":"-0.0060347768","long_unrealised_pnl":"-9.12E-6","long_open_outstanding":"0.0","short_open_outstanding":"0.0"}

recv account info {"ETH":{"equity":"0.10004154","margin":"0.00152495","realized_pnl":"-0.00001524","unrealized_pnl":"-0.00000912","margin_ratio":"3.28015804","margin_mode":"crossed","total_avail_balance":"0.1000659","margin_frozen":"0.00152495","margin_for_unfilled":"0","liqui_mode":"tier","maint_margin_ratio":"0.01","available":"0.09851659","open_max":"64","available_balance":"0.09851659"}}

==== 开仓取消一刻

recv position info {"long_qty":"1","long_avail_qty":"1","long_avg_cost":"327.977","long_settlement_price":"327.977","realised_pnl":"-0.00001524","short_qty":"0","short_avail_qty":"0","short_avg_cost":"0","short_settlement_price":"0","liquidation_price":"77.371","instrument_id":"ETH-USD-190927","leverage":"20","created_at":"2019-06-20T11:46:54.000Z","updated_at":"2019-06-22T11:56:04.000Z","margin_mode":"crossed","short_margin":"0.0","short_pnl":"0.0","short_pnl_ratio":"0.0","short_unrealised_pnl":"0.0","long_margin":"0.00152614","long_pnl":"-3.285E-5","long_pnl_ratio":"-0.0215808866","long_unrealised_pnl":"-3.285E-5","long_open_outstanding":"0.0","short_open_outstanding":"0.0"}

recv account info {"ETH":{"equity":"0.10001781","margin":"0.00152614","realized_pnl":"-0.00001524","unrealized_pnl":"-0.00003285","margin_ratio":"3.2768229","margin_mode":"crossed","total_avail_balance":"0.1000659","margin_frozen":"0.00152614","margin_for_unfilled":"0","liqui_mode":"tier","maint_margin_ratio":"0.01","available":"0.09849167","open_max":"64","available_balance":"0.09849167"}}

recv order info {"leverage":"20","last_fill_time":"1970-01-01T00:00:00.000Z","filled_qty":"0","fee":"0","price_avg":"0.0","type":"1","client_oid":"","last_fill_qty":"0","instrument_id":"ETH-USD-190927","last_fill_px":"0","size":"1","system_type":0,"price":"327.566","state":"-1","contract_val":"10","order_id":"3045358214661120","order_type":"0","timestamp":"2019-06-22T11:54:38.000Z","status":"-1"}

==== 平仓下单一刻

recv account info {"ETH":{"available":"0.09863831","available_balance":"0.09863831","equity":"0.10015747","liqui_mode":"tier","maint_margin_ratio":"0.01","margin":"0.00151916","margin_for_unfilled":"0","margin_frozen":"0.00151916","margin_mode":"crossed","margin_ratio":"3.29647535","open_max":"64","realized_pnl":"-0.00001524","total_avail_balance":"0.1000659","unrealized_pnl":"0.00010681"}}

recv position info {"long_qty":"1","long_avail_qty":"0","long_avg_cost":"327.977","long_settlement_price":"327.977","realised_pnl":"-0.00001524","short_qty":"0","short_avail_qty":"0","short_avg_cost":"0","short_settlement_price":"0","liquidation_price":"77.371","instrument_id":"ETH-USD-190927","leverage":"20","created_at":"2019-06-20T11:46:54.000Z","updated_at":"2019-06-22T12:05:29.000Z","margin_mode":"crossed","short_margin":"0.0","short_pnl":"0.0","short_pnl_ratio":"0.0","short_unrealised_pnl":"0.0","long_margin":"0.00151916","long_pnl":"1.0681E-4","long_pnl_ratio":"0.0700558872","long_unrealised_pnl":"1.0681E-4","long_open_outstanding":"0","short_open_outstanding":"0"}

recv order info {"leverage":"20","last_fill_time":"1970-01-01T00:00:00.000Z","filled_qty":"0","fee":"0","price_avg":"0.0","type":"3","client_oid":"","last_fill_qty":"0","instrument_id":"ETH-USD-190927","last_fill_px":"0","size":"1","system_type":0,"price":"329.077","state":"0","contract_val":"10","order_id":"3045400875781120","order_type":"0","timestamp":"2019-06-22T12:05:29.000Z","status":"0"}

==== 平仓成交一刻

recv order info {"leverage":"20","last_fill_time":"2019-06-22T12:05:29.643Z","filled_qty":"1","fee":"-0.00001519","price_avg":"329.138","type":"3","client_oid":"","last_fill_qty":"1","instrument_id":"ETH-USD-190927","last_fill_px":"329.138","size":"1","system_type":0,"price":"329.077","state":"2","contract_val":"10","order_id":"3045400875781120","order_type":"0","timestamp":"2019-06-22T12:05:29.000Z","status":"2"}

recv position info {"long_qty":"0","long_avail_qty":"0","long_avg_cost":"327.977","long_settlement_price":"327.977","realised_pnl":"0.00007712","short_qty":"0","short_avail_qty":"0","short_avg_cost":"0","short_settlement_price":"0","liquidation_price":"0.0","instrument_id":"ETH-USD-190927","leverage":"20","created_at":"2019-06-20T11:46:54.000Z","updated_at":"2019-06-22T12:05:29.000Z","margin_mode":"crossed","short_margin":"0.0","short_pnl":"0.0","short_pnl_ratio":"0.0","short_unrealised_pnl":"0.0","long_margin":"0.0","long_pnl":"0.0","long_pnl_ratio":"0.0700558872","long_unrealised_pnl":"0.0","long_open_outstanding":"0.0","short_open_outstanding":"0.0"}

recv account info {"ETH":{"equity":"0.10014302","margin":"0","realized_pnl":"0.00007712","unrealized_pnl":"0","margin_ratio":"10000","margin_mode":"crossed","total_avail_balance":"0.1000659","margin_frozen":"0","margin_for_unfilled":"0","liqui_mode":"tier","maint_margin_ratio":"0.01","available":"0.10014302","open_max":"65","available_balance":"0.1000659"}}
```
