const Fs = require('fs');
const Path = require('path');

/**
 * 同步加载控制器
 */
class SyncLoader {
  constructor(filename) {
    this.filename = filename;
  }

  start() {
    return this;
  }

  getFile() {
    return Path.join(__dirname, '../data', this.filename + '.json');
  };

  // 读取持久化数据
  read() {
    const file = this.getFile();
    if (!Fs.existsSync(file)) return;

    const data = Fs.readFileSync(file, 'utf8');
    const json = JSON.parse(data);

    // console.log('读取缓存数据 %j', json);

    return json;
  };

  // 写入持久化数据
  write(json) {
    const file = this.getFile();

    // Fs.writeFileSync(file, JSON.stringify(json, null, 2));
    Fs.writeFileSync(file, JSON.stringify(json));

    // console.log('保存缓存数据 %j', json);
  };

}
exports.SyncLoader = SyncLoader;


/**
 * 热加载控制器
 */
class HotLoader {
  constructor(filename, seconds) {
    this.filename = filename;
    this.seconds = seconds;

    this.expired = 0;
    this.value = {};
  }

  start() {
    this.value = this.read();

    return this;
  }

  getFile() {
    return Path.join(__dirname, '../data', this.filename + '.json');
  };

  setExpired() {
    this.expired = Date.now() + this.seconds * 1e3;
  }

  write(data) {
    const file = this.getFile();
    Fs.writeFileSync(file, JSON.stringify(data));
  }

  read() {
    if (this.expired < Date.now()) {
      const file = this.getFile();
      if (!Fs.existsSync(file)) return;

      Fs.readFile(file, (err, data) => {
        this.value = JSON.parse(data);
      });
      this.setExpired();
    }
    return this.value;
  };
}
exports.HotLoader = HotLoader;

if (require.main === module) {
  // Question 打印日志的时候发现什么问题了么?

  // const hotLoader = new HotLoader('ab', 10).start();

  // setInterval(() => {
  //   // 读数据
  //   console.log(hotLoader.read());
  // }, 1e3);

  // setInterval(() => {
  //   // 写数据
  //   hotLoader.write({ value: Math.random() });
  // }, 5e3);

  // const syncLoader = new SyncLoader('ab').start();

  // setInterval(() => {
  //   // 读数据
  //   console.log(syncLoader.read());
  // }, 1e3);

  // setInterval(() => {
  //   // 写数据
  //   syncLoader.write({ value: Math.random() });
  // }, 5e3);
}
