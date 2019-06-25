var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var onExit = require('signal-exit');

var app = express();

const Exchange = require('./service/exchange');
const SyncLoader = require('./service/datastore').SyncLoader;
const MovingTrigger = require('./service/trigger');

// 数据持久化
const syncTrigger = new SyncLoader('trigger');

// 交易所数据+接口
const exchange = Exchange.getInstance().init();

// Moving Trigger 封装
const trigger = MovingTrigger.getInstance();
// 从数据恢复
const triggerInfo = syncTrigger.read();
if (triggerInfo) {
  trigger.restoreMtp(triggerInfo);
  console.log('从持久化恢复 trigger 数据 %j', triggerInfo);
}
trigger.init(exchange);

const writeTriggerInfo = () => {
  const triggerMtp = trigger.loadMtp();
  if (!triggerMtp) {
    console.log('持久化数据失败 未初始化 trigger');
    return null;
  }

  const triggerInfo = triggerMtp.toJson();
  syncTrigger.write(triggerInfo);
  return triggerInfo;
};

onExit((code, signal) => {
  const triggerInfo = writeTriggerInfo();
  if (!triggerInfo) return;
  console.log('process exited signal %s code %s! 持久化数据 %j', signal, code, triggerInfo);
});

exchange.on('close', () => {
  console.log('Exchange WebSocket Closed');
  process.exit();
});

trigger.on('persistence', (reason) => {
  const triggerInfo = writeTriggerInfo();
  if (!triggerInfo) return;
  console.log('持久化 trigger %s 数据 %j', reason, triggerInfo);
});

setInterval(() => {
  const prices = exchange.getPrices();
  if (Date.now() - prices.updated > 5e3) {
    console.log('价格记录已经过期 %j', prices);
    if (prices.updated !== 0 && Date.now() - prices.updated > 60e3) process.exit();

    return;
  }

  trigger.updatePrice(prices);
}, 5e2);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
