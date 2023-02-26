const express = require('express');
const line = require('@line/bot-sdk');
const sqlite3 = require('sqlite3').verbose();

// 資料庫連線
const db = new sqlite3.Database('leave.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

// 創建資料表
db.run(`CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  date TEXT
)`);

// LINE BOT的設定
const config = {
  channelAccessToken: '/D/R0qMhlQ6PKM+VAtTASAkh05YpaS2kQwtX8WOxtwfbpNiH5xR2Vzd9tKblmInPMDynJqsvrbOwRWBboI43lqk702qVGrUcIN/CqNobWXc/SUygNYCeYF/sSZoSNSAmQs7GomnKs8OF+R+BugT2KgdB04t89/1O/w1cDnyilFU=',
  channelSecret: '332835de08ef590f3c9eb55d99901477',
};

// 創建LINE BOT實例
const bot = new line.Client(config);

// 創建express實例
const app = express();

// 設定路由
app.post('/', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 處理事件
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const message = event.message.text;

  if (message === '/請假') {
    const userId = event.source.userId;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const date = `${tomorrow.getFullYear()}/${tomorrow.getMonth() +
      1}/${tomorrow.getDate()}`;

    // 將請假資料儲存到資料庫中
    db.run(
      `INSERT INTO leaves (userId, date) VALUES (?, ?)`,
      [userId, date],
      (err) => {
        if (err) {
          console.error(err.message);
        }
      }
    );

    return bot.replyMessage(event.replyToken, {
      type: 'text',
      text: `已記錄您的請假日期為 ${date}`,
    });
  } else if (message === '/請假人員') {
    const userId = event.source.userId;
    const params = event.message.text.split(' ');
    let date;

    if (params.length === 1) {
      const today = new Date();
      date = `${today.getFullYear()}/${today.getMonth() +
        1}/${today.getDate()}`;
    } else {
      date= params[1];
    }

    // 查詢資料庫中該日請假人員
    db.all(
      `SELECT userId FROM leaves WHERE date = ?`,
      [date],
      (err, rows) => {
        if (err) {
          console.error(err.message);
        }
        const userIds = rows.map((row) => row.userId);
        const message =
          userIds.length === 0
            ? '當日無人請假'
            : `當日請假人員：${userIds.join(', ')}`;

        return bot.replyMessage(event.replyToken, {
          type: 'text',
          text: message,
	});
      });
  
return Promise.resolve(null);

} else {
return Promise.resolve(null);
}
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
console.log(`listening on ${port}`);
});

// 定時發送請假人員資訊
function sendLeaveUsers() {
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const date = `${tomorrow.getFullYear()}/${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;

// 查詢資料庫中隔日請假人員
db.all(`SELECT userId FROM leaves WHERE date = ?`, [date], (err, rows) => {
if (err) {
console.error(err.message);
}

const userIds = rows.map((row) => row.userId);
const message =
  userIds.length === 0
    ? `隔日無人請假`
    : `隔日請假人員：${userIds.join(', ')}`;

// 發送訊息給LINE上的聊天室
bot.pushMessage('聊天室ID', {
  type: 'text',
  text: message,
});

});
}

// 設定定時器，每天下午4點50分執行
const cron = require('node-cron');
cron.schedule('50 16 * * *', sendLeaveUsers);






