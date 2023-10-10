const User = require("../model/user");
var KiteConnect = require("kiteconnect").KiteConnect;
var KiteTicker = require("kiteconnect").KiteTicker;
const fs = require('fs');

const open = import("open")
  .then((res) => {
    console.log(res.default);
    return res.default;
  })
  .catch((err) => {
    console.log(err);
  });

exports.getDashboard = (req, res, next) => {
  const email = req.email;
  var kc;
  var api_key, secretkey, requestToken;
  User.findByEmailId(email)
    .then((result) => {
      api_key = result.api_key;
      secretkey = result.secret_key;
    })
    .then(() => {
      console.log(api_key, "api_key");
      kc = new KiteConnect({
        api_key: api_key,
      });
    })
    .then(() => {
      res.status(200).json({
        message: "login Url Opened",
        api_key: api_key,
      });
    });
};

exports.getAccessToken = (req, res, next) => {
  const { tokenUrl } = req.body;
  const index = tokenUrl.indexOf("request_token");
  const currentRequestToken = tokenUrl.slice(index + 14, index + 14 + 32);
  const secret = req.secretKey;
  const api_key = req.apiKey;
  let access = "";
  var kc = new KiteConnect({
    api_key: api_key,
  });

  // findByIdAndUpdateToken
  kc.generateSession(currentRequestToken, secret)
    .then(function (response) {
      User.findByIdAndUpdateToken(req.userId, response.access_token).then(
        () => {
          res.status(200).json({
            message: "Access Token Generated",
          });
        }
      );
    })
    .catch(function (err) {
      console.log(err), "error";
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.placeFirstTrade = (req, res, next) => {
  const {
    price,
    quantity,
    transaction_type,
    exchange,
    tradingsymbol,
    entry_type,
    email,
    lossPrice,
    profitPrice,
    date,
  } = req.body;

  var kc;
  var ticker;
  var api_key, secretkey, requestToken, access_token;
  let newPrice = 0;
  let symbol = "";
  let ordered;
  let inst_token;
  let purchasePrice;

  async function regularOrderPlace(variety, symbol, order_type, prices, type) {
    console.log(symbol, "SYMBOL");
    await kc
      .placeOrder(variety, {
        exchange: exchange,
        tradingsymbol: symbol,
        transaction_type: type ? type : transaction_type,
        quantity: quantity,
        product: "MIS",
        // product: "NRML",
        order_type: order_type ? "LIMIT" : "MARKET",
        // price: price 
      })
      .then(async function (resp) {
        console.log(resp, "responseID");
        ordered = await resp?.order_id;
        return resp?.order_id;
      })
      .catch(function (err) {
        console.log(err);
      });

    return ordered;
  }

  User.findByEmailId(email)
    .then((result) => {
      api_key = result.api_key;
      secretkey = result.secret_key;
      access_token = result.access_token;
    })
    .then(() => {
      kc = new KiteConnect({
        api_key: api_key,
      });
    })
    .then(() => {
      kc.setAccessToken(access_token);

      // ticker = new KiteTicker({
      //   api_key: api_key,
      //   access_token: access_token
      // })

      if (entry_type === "CE") {
        newPrice = Math.round(Math.floor(price - 200) / 100) * 100;
        symbol = tradingsymbol + date + newPrice + "CE";
      } else if (entry_type === "PE") {
        newPrice = Math.round(Math.floor(price + 200) / 100) * 100;
        symbol = tradingsymbol + date + newPrice + "PE";
      } else {
        symbol = tradingsymbol;
      }
      let x = regularOrderPlace("regular", symbol).then((res) => {
        return res;
      });
      return x;
    })
    .then((res) => {
      console.log("buy order placed");
      return kc
        .getOrderHistory(res)
        .then((res) => {
          return res[res?.length - 1];
        })
        .catch((err) => {
          console.log(err, "error");
        });
    })
    .then((res) => {
      console.log(res, "in order");
      inst_token = res?.instrument_token
      purchasePrice = res?.average_price
      return kc.placeGTT({
        trigger_type: kc.GTT_TYPE_SINGLE,
        tradingsymbol: symbol,
        exchange: exchange,
        trigger_values: [
          res?.average_price - Number(lossPrice),
          // res?.average_price + Number(profitPrice),
        ],
        last_price: res?.average_price,
        orders: [
          {
            transaction_type: kc.TRANSACTION_TYPE_SELL,
            quantity: quantity,
            product: "NRML",
            order_type: "MARKET",
            price: res?.average_price - Number(lossPrice),
          },
          // {
          //   transaction_type: kc.TRANSACTION_TYPE_SELL,
          //   quantity: quantity,
          //   product: "NRML",
          //   order_type: "MARKET",
          //   price: res?.average_price + Number(profitPrice),
          // },
        ],
      });
    })
    .then((result) => {
      console.log(result, "GTT placing");
      // res.status(200).json({
      //   message: "All trades Placed",
      return result
      // });
    })
    .then(res => {

      ticker = new KiteTicker({
        api_key: api_key,
        access_token: access_token
      })

      ticker.autoReconnect(true, 5, 5)
      ticker.connect();
      ticker.on("ticks", onTicks);
      ticker.on("connect", subscribe);

      ticker.on("noreconnect", function () {
        console.log("noreconnect");
      });

      ticker.on("reconnect", function (reconnect_count, reconnect_interval) {
        console.log("Reconnecting: attempt - ", reconnect_count, " interval - ", reconnect_interval);
      });

      function onTicks(ticks) {
        // console.log("Ticks", ticks);
        console.log("price is", ticks[0]?.last_price)
        console.log(res?.trigger_id)
        if (ticks[0]?.last_price > purchasePrice) {
          purchasePrice = ticks[0]?.last_price
          console.log('in Now Modify')
          kc.modifyGTT(res?.trigger_id, {
            trigger_type: kc.GTT_TYPE_SINGLE,
            tradingsymbol: symbol,
            exchange: 'NFO',
            trigger_values: [
              ticks[0]?.last_price - Number(lossPrice),
              // ticks[0]?.last_price + 10,
            ],
            last_price: ticks[0]?.last_price,
            orders: [
              {
                transaction_type: kc.TRANSACTION_TYPE_SELL,
                quantity: 1,
                product: "NRML",
                order_type: "MARKET",
                price: ticks[0]?.last_price - Number(lossPrice),
              },
              // {
              //   transaction_type: kc.TRANSACTION_TYPE_SELL,
              //   quantity: 1,
              //   product: "NRML",
              //   order_type: "MARKET",
              //   price: ticks[0]?.last_price + 10,
              // },
            ],
          })
            .then(res => console.log(res, "in mod res")).catch(err => {
              console.log(err)
            })
        }
      }
      function subscribe() {
        var items = [inst_token];
        ticker.subscribe(items);
        ticker.setMode(ticker.modeFull, items);
      }
    }).then(() => {
      res.status(200).json({
        message: "All trades Placed",
      });
    })
    .catch((err) => {
      console.log(err, "efw");
      next(err);
    });
};

// var KiteTicker = require("kiteconnect").KiteTicker;

// var ticker = new KiteTicker({
//   api_key: "1ix41lqqkd32lk6b",
//   access_token: "nYIdcENmsmA6JNBAl7tUCjTd4s5TslhW"
// });

// var kc = new KiteConnect({
//   api_key: '1ix41lqqkd32lk6b',
//   access_token: "nYIdcENmsmA6JNBAl7tUCjTd4s5TslhW"
// });

// exports.getTicker = (req, res, next) => {
//   ticker = new KiteTicker({
//     api_key: api_key,
//     access_token: access_token
//   })
//   console.log(ticker,"sdfd")
//   // set autoreconnect with 10 maximum reconnections and 5 second interval
//   ticker.autoReconnect(true, 5, 5)
//   ticker.connect();
//   ticker.on("ticks", onTicks);
//   ticker.on("connect", subscribe);

//   ticker.on("noreconnect", function () {
//     console.log("noreconnect");
//   });

//   ticker.on("reconnect", function (reconnect_count, reconnect_interval) {
//     console.log("Reconnecting: attempt - ", reconnect_count, " interval - ", reconnect_interval);
//   });

//   function onTicks(ticks) {
//     console.log("Ticks", ticks);
//     console.log("price is", ticks[0]?.last_price)
//     // kc.modifyGTT('163226598', {
//     //   trigger_type: kc.GTT_TYPE_SINGLE,
//     //   tradingsymbol: 'NIFTY2381019200PE',
//     //   exchange: 'NFO',
//     //   trigger_values: [
//     //     ticks[0]?.last_price - 5,
//     //     ticks[0]?.last_price + 10,
//     //   ],
//     //   last_price: ticks[0]?.last_price,
//     //   orders: [
//     //     {
//     //       transaction_type: kc.TRANSACTION_TYPE_SELL,
//     //       quantity: 1,
//     //       product: "NRML",
//     //       order_type: "MARKET",
//     //       price: ticks[0]?.last_price - 5,
//     //     },
//     //     {
//     //       transaction_type: kc.TRANSACTION_TYPE_SELL,
//     //       quantity: 1,
//     //       product: "NRML",
//     //       order_type: "MARKET",
//     //       price: ticks[0]?.last_price + 10,
//     //     },
//     //   ],
//     // }).then(res => console.log(res)).catch(err => {
//     //   console.log(err)
//     // })
//   }

//   function subscribe() {
//     var items = [12246274];
//     ticker.subscribe(items);
//     ticker.setMode(ticker.modeFull, items);
//   }
// }

exports.getAllUsers = (req, res, next) => {
  const {
    price,
    quantity,
    transaction_type,
    exchange,
    tradingsymbol,
    entry_type,
    email,
    lossPrice,
    profitPrice,
    date,
  } = req.body;


  var api_key, secretkey, requestToken, access_token;
  let inst_token;
  const rejected = [];

  async function regularOrderPlace(variety, symbol, order_type, prices, type) {
    console.log(symbol, "SYMBOL");
    await kc
      .placeOrder(variety, {
        exchange: exchange,
        tradingsymbol: symbol,
        transaction_type: type ? type : transaction_type,
        quantity: quantity,
        // product: "MIS",
        product: exchange == 'NSE' ? "MIS" : "NRML",
        order_type: order_type ? "LIMIT" : "MARKET",
        // price: price 
      })
      .then(async function (resp) {
        console.log(resp, "responseID");
        ordered = await resp?.order_id;
        return resp?.order_id;
      })
      .catch(function (err) {
        console.log(err,'err');
      });

    return ordered;
  }

  // async function modifyGTTOrders(triggerId,price){
  //   return await kc.modifyGTT(trigger_id, {
  //     trigger_type: kc.GTT_TYPE_SINGLE,
  //     tradingsymbol: symbol,
  //     // exchange: 'NFO',
  //     exchange: exchange,
  //     trigger_values: [
  //       price - Number(lossPrice),
  //       // ticks[0]?.last_price + 10,
  //     ],
  //     last_price: price,
  //     orders: [
  //       {
  //         transaction_type: kc.TRANSACTION_TYPE_SELL,
  //         quantity: quantity,
  //         product: "NRML",
  //         order_type: "MARKET",
  //         price: price - Number(lossPrice),
  //       },
  //     ],
  //   })
  // }

  const x = new Promise((resolve, reject) => {
    email.forEach((ele, index) => {
      User.findByEmailId(ele)
        .then((result) => {
          api_key = result.api_key;
          secretkey = result.secret_key;
          access_token = result.access_token;
        })
        .then(() => {
          kc = new KiteConnect({
            api_key: api_key,
          });
        })
        .then(() => {
          kc.setAccessToken(access_token);
          if (entry_type === "CE") {
            newPrice = Math.round(Math.floor(price - 200) / 100) * 100;
            symbol = tradingsymbol + date + newPrice + "CE";
          } else if (entry_type === "PE") {
            newPrice = Math.round(Math.floor(price + 200) / 100) * 100;
            symbol = tradingsymbol + date + newPrice + "PE";
          } else {
            symbol = tradingsymbol;
          }
          let x = regularOrderPlace("regular", symbol).then((res) => {
            return res;
          });
          return x;
        })
        .then((res) => {
          console.log("buy order placed");
          return kc
            .getOrderHistory(res)
            .then((res) => {
              console.log(res[res?.length - 1])
              return res[res?.length - 1];
            })
            .catch((err) => {
              console.log(err, "error");
            });
        })
        .then(async (res) => {
          inst_token = res?.instrument_token
          purchasePrice = res?.average_price
          if (res?.status != 'REJECTED') {
            return await kc.placeGTT({
              trigger_type: kc.GTT_TYPE_SINGLE,
              tradingsymbol: symbol,
              exchange: exchange,
              trigger_values: [
                res?.average_price - Number(lossPrice),
              ],
              last_price: res?.average_price,
              orders: [
                {
                  transaction_type: kc.TRANSACTION_TYPE_SELL,
                  quantity: quantity,
                  product: "NRML",
                  order_type: "MARKET",
                  price: res?.average_price - Number(lossPrice),
                },
              ],
            });
          } else {
            rejected.push(res?.placed_by)
            return res
          }
          
        })
        .then((result) => {
          console.log(result, "GTT placing");
          // if (index === email.length -1) resolve();
          return result
        }).then(async res => {
          let x = await this.sendTicker(api_key,access_token,res)
          console.log(x,"returned")
        })
       
    })
  });
  x
    // .then(res => {

    //   //   kc.getInstruments('MCX').then(resp =>
    //   //     {
    //   //       console.log(resp) 

    //   //       try {
    //   //         fs.writeFileSync('../Abhi/exchangeData.csv', JSON.stringify(resp));
    //   //         // file written successfully
    //   //       } catch (err) {
    //   //         console.error(err);
    //   //       }
    //   // })
    //   //   kc.getQuote('CRUDEOIL23SEP7400CE').then(resp =>console.log(resp))
    //   ticker = new KiteTicker({
    //     api_key: api_key,
    //     access_token: access_token
    //   })
    //   console.log(res, "result in")
    //   console.log(ticker, api_key, "ticks")
    //   ticker.autoReconnect(true, 5, 5)
    //   ticker.connect();
    //   ticker.on("ticks", onTicks);
    //   ticker.on("connect", subscribe);

    //   ticker.on("noreconnect", function () {
    //     console.log("noreconnect");
    //   });

    //   ticker.on("reconnect", function (reconnect_count, reconnect_interval) {
    //     console.log("Reconnecting: attempt - ", reconnect_count, " interval - ", reconnect_interval);
    //   });

    //   // function onTicks(ticks){
    //   //   console.log("price is", ticks[0]?.last_price)
    //   // }
    //   function onTicks(ticks) {
    //     // console.log("Ticks", ticks);
    //     console.log("price is", ticks[0]?.last_price)
    //     console.log(res?.trigger_id)
    //     if (ticks[0]?.last_price > purchasePrice) {
    //       purchasePrice = ticks[0]?.last_price
    //       console.log('in Now Modify')
    //       kc.modifyGTT(res?.trigger_id, {
    //         trigger_type: kc.GTT_TYPE_SINGLE,
    //         tradingsymbol: symbol,
    //         // exchange: 'NFO',
    //         exchange: exchange,
    //         trigger_values: [
    //           ticks[0]?.last_price - Number(lossPrice),
    //           // ticks[0]?.last_price + 10,
    //         ],
    //         last_price: ticks[0]?.last_price,
    //         orders: [
    //           {
    //             transaction_type: kc.TRANSACTION_TYPE_SELL,
    //             quantity: 1,
    //             product: "NRML",
    //             order_type: "MARKET",
    //             price: ticks[0]?.last_price - Number(lossPrice),
    //           },
    //           // {
    //           //   transaction_type: kc.TRANSACTION_TYPE_SELL,
    //           //   quantity: 1,
    //           //   product: "NRML",
    //           //   order_type: "MARKET",
    //           //   price: ticks[0]?.last_price + 10,
    //           // },
    //         ],
    //       })
    //         .then(res => console.log(res, "in mod res")).catch(err => {
    //           console.log(err)
    //         })
    //     }
    //   }

    //   function subscribe() {
    //     var items = [inst_token];
    //     ticker.subscribe(items);
    //     ticker.setMode(ticker.modeFull, items);
    //   }
    // })
    .then(() => {
      res.status(200).json({
        message: "trades Placed",
        tradesRejected: rejected
      });
    })
    .catch((err) => {
      console.log(err, "efw");
      next(err);
    });
}

exports.getTicker = async (req,res,next) => {
  let api_key="1ix41lqqkd32lk6b";
  let access_token = "sdfsdf"
 let x = await this.sendTicker({api_key:api_key,access_token:access_token})
 console.log(x,"returned")
}

exports.sendTicker = async (req,res,next) => {
      ticker = new KiteTicker({
        api_key: req?.api_key,
        access_token: req?.access_token
      })
      ticker.connect();
      // let order = res?.order_id
      // ticker.on('order_update', (order) => {
      //   console.log('order_updated', order);
      // });
      ticker.on('connect', subscribe)
      ticker.on("ticks", onTicks);
    
      function onTicks(ticks) {
        // console.log("Ticks", ticks);
        console.log("price is", ticks[0]?.last_price)
        // console.log(res?.trigger_id)
        // if (ticks[0]?.last_price > purchasePrice) {
        //   purchasePrice = ticks[0]?.last_price
        //   console.log('in Now Modify')
        //   return kc.modifyGTT(res?.trigger_id, {
        //     trigger_type: kc.GTT_TYPE_SINGLE,
        //     tradingsymbol: symbol,
        //     // exchange: 'NFO',
        //     exchange: exchange,
        //     trigger_values: [
        //       ticks[0]?.last_price - Number(lossPrice),
        //     ],
        //     last_price: ticks[0]?.last_price,
        //     orders: [
        //       {
        //         transaction_type: kc.TRANSACTION_TYPE_SELL,
        //         quantity: quantity,
        //         product: "NRML",
        //         order_type: "MARKET",
        //         price: ticks[0]?.last_price - Number(lossPrice),
        //       },
        //     ],
        //   })
        // }
      }
      function subscribe() {
        var items = [[12246274]];
        ticker.subscribe(items);
        ticker.setMode(ticker.modeFull, items);
      }
       
    }

// .then((res) => {
//   ticker = new KiteTicker({
//     api_key: api_key,
//     access_token: access_token
//   })
//   ticker.connect();
//   let order = res?.order_id
//   ticker.on('order_update', (order) => {
//     console.log('order_updated', order);
//   });
//   ticker.on('connect', subscribe)
//   ticker.on("ticks", onTicks);

//   function onTicks(ticks) {
//     // console.log("Ticks", ticks);
//     console.log("price is", ticks[0]?.last_price)
//     console.log(res?.trigger_id)
//     if (ticks[0]?.last_price > purchasePrice) {
//       purchasePrice = ticks[0]?.last_price
//       console.log('in Now Modify')
//       // return kc.modifyGTT(res?.trigger_id, {
//       //   trigger_type: kc.GTT_TYPE_SINGLE,
//       //   tradingsymbol: symbol,
//       //   // exchange: 'NFO',
//       //   exchange: exchange,
//       //   trigger_values: [
//       //     ticks[0]?.last_price - Number(lossPrice),
//       //   ],
//       //   last_price: ticks[0]?.last_price,
//       //   orders: [
//       //     {
//       //       transaction_type: kc.TRANSACTION_TYPE_SELL,
//       //       quantity: quantity,
//       //       product: "NRML",
//       //       order_type: "MARKET",
//       //       price: ticks[0]?.last_price - Number(lossPrice),
//       //     },
//       //   ],
//       // })
//       return modifyGTTOrders(res?.trigger_id,ticks[0]?.last_price)
//         .then(res => console.log(res, "in mod res"))
//         .catch(err => {
//           console.log(err)
//         })
//     }
//   }
//   function subscribe() {
//     var items = [inst_token];
//     ticker.subscribe(items);
//     ticker.setMode(ticker.modeFull, items);
//   }
// }).then((res) =>{
//   if (index === email.length -1) resolve();
// })
// .catch(err => {
//   console.log(err, "ord err")
// })