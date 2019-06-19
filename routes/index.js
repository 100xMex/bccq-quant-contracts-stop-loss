var express = require('express');
var router = express.Router();

const trigger = require('../service/trigger');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.end();
});

router.get('/place_open', (req, res, next) => {
  const longshort = req.query.longshort ? 1 : 0; // 多空
  const price = parseFloat(req.query.price); // 价格
  const cont = parseInt(req.query.cont, 10); // 张数

  // 其余参数, 杠杆等都是默认值, 暂时不做传参.

  const username = req.headers.username;
  const nickname = req.headers.nickname;

  trigger.addCont(longshort, price, cont);

  res.json({ params: req.query });
});

router.get('/place_close', (req, res, next) => {
  const longshort = req.query.longshort ? 1 : 0; // 多空
  const price = parseFloat(req.query.price); // 价格
  const cont = parseInt(req.query.cont, 10); // 张数

  // 其余参数, 杠杆等都是默认值, 暂时不做传参.

  const username = req.headers.username;
  const nickname = req.headers.nickname;

  trigger.subCont(longshort, price, cont);

  res.json({ params: req.query });
});


module.exports = router;
