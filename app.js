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

// 交易所数据+接口
const exchange = Exchange.getInstance().init();
// Moving Trigger 封装
const trigger = MovingTrigger.getInstance().init(exchange);
// 数据持久化
const syncTrigger = new SyncLoader('trigger');

onExit((code, signal) => {
  const triggerInfo = trigger.loadMtp().toJson();
  syncTrigger.write(triggerInfo);
  console.log('process exited signal %s code %s! 持久化数据 %j', signal, code, triggerInfo);
});

trigger.on('persistence', (reason) => {
  const triggerInfo = trigger.loadMtp().toJson();
  syncTrigger.write(triggerInfo);
  console.log('持久化 trigger %s 数据 %j', reason, triggerInfo);
});

const triggerInfo = syncTrigger.read();
if (triggerInfo) {
  trigger.restoreMtp(triggerInfo);
  console.log('从持久化恢复 trigger 数据 %j', triggerInfo);
}

setInterval(() => {
  const prices = exchange.getPrices();
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
