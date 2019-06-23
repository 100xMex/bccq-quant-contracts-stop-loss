var express = require('express');
var router = express.Router();

const Trigger = require('../service/trigger');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.end();
});

router.get('/place_view', (req, res, next) => {
  const trigger = Trigger.getInstance();

  res.render('order', { title: '开仓下单工具', info: trigger.loadMtp().toJson() });
});

router.get('/place_open', (req, res, next) => {
  const longshort = parseInt(req.query.longshort, 10) > 0 ? 1 : 0; // 多空
  const price = parseFloat(req.query.price); // 价格
  const cont = parseInt(req.query.cont, 10); // 张数

  // 其余参数, 杠杆等都是默认值, 暂时不做传参.

  const username = req.headers.username;
  const nickname = req.headers.nickname;

  const trigger = Trigger.getInstance();
  trigger.addCont(longshort, cont, price).then(orderId => {
    res.json({
      params: req.query,
      orderId
    });
  });
});

router.get('/place_close', (req, res, next) => {
  const longshort = parseInt(req.query.longshort, 10) > 0 ? 1 : 0; // 多空
  const price = parseFloat(req.query.price); // 价格
  const cont = parseInt(req.query.cont, 10); // 张数

  // 其余参数, 杠杆等都是默认值, 暂时不做传参.

  const username = req.headers.username;
  const nickname = req.headers.nickname;

  const trigger = Trigger.getInstance();
  trigger.subCont(longshort, cont, price).then(orderId => {
    res.json({
      params: req.query,
      orderId
    });
  });
});


module.exports = router;
