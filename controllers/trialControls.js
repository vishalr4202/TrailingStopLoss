const User = require("../model/user");
var KiteConnect = require("kiteconnect").KiteConnect;
var KiteTicker = require("kiteconnect").KiteTicker;
const logger = require('../logger/index')
exports.ticksData = (req, res, next) => {
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
        order
    } = req.body;

    var ticker;
    var api_key, secretkey, requestToken, access_token
    var tick_api, tick_access
    const arr = [];
    const orderIds = [];
    var inst_token;

    async function regularOrderPlace(variety, symbol, order_type, prices, type) {
        // console.log(symbol, "SYMBOL");
        await kc
            .placeOrder(variety, {
                exchange: exchange,
                tradingsymbol: symbol,
                transaction_type: type ? type : transaction_type,
                quantity: quantity,
                product: exchange == 'NSE' ?  "MIS" : "NRML",
                // product: "NRML",
                order_type: order_type ? "LIMIT" : "MARKET",
                // price: price 
            })
            .then(async function (resp) {
                // console.log(resp, "responseID");
                logger.info(`${resp?.order_id}, responseID`)
                orderIds.push(resp?.order_id)
                ordered = await resp?.order_id;
                return resp?.order_id;
            })
            .catch(function (err) {
                console.log(err);
            });

        return ordered;
    }

    if((order == 'buy' && entry_type == 'CE') || (order == 'sell' && entry_type=='PE')){
        logger.info('in request')
    const x = new Promise((resolve, reject) => {
        const data = email.map(async (ele, index) => {
            await User.findByEmailId(ele).then((result) => {
                api_key = result.api_key;
                secretkey = result.secret_key;
                access_token = result.access_token;
                arr.push(ele)
                if (index == 0) {
                    tick_api = result.api_key
                    tick_access = result.access_token
                    // console.log("in user 1", tick_api, index)
                    logger.info(`in user 1 ${tick_api}, ${index}`)
                }
            }).then(() => {
                kc = new KiteConnect({
                    api_key: api_key,
                });
            }).then(() => {
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
                // console.log(symbol, "symbol")
                logger.info(`${symbol},symbol`)
                let x = regularOrderPlace("regular", symbol).then((res) => {
                    return res;
                }).catch(err => {
                    // console.log(err)
                    logger.error(err)
                });
                return x;
            })
            .then((res) => {
                // console.log("buy order placed");
                logger.info("buy order placed")
                if(index === 0){
                    return kc
                    .getOrderHistory(res)
                    .then((res) => {
                        inst_token = res[res?.length - 1]?.instrument_token
                    //   return res[res?.length - 1];
                    })
                    .catch((err) => {
                      console.log(err, "error");
                    });
                }
                else{
                //    console.log(`won't fetch ${ele}`)
                   logger.info(`won't fetch ${ele}`)
                }
              }).then(resp => {
                // console.log(resp,"SDfs")
                // logger.info(resp,"SDfs")
              })
                .catch(err => {
                    reject(err)
                })
            if (index === email.length - 1) return resolve({ data, tick_api, tick_access });
        })

    }).then(resp => {
        // console.log(arr, orderIds, tick_access, tick_api, inst_token,"in tickd")
        logger.info(arr, orderIds, tick_access, tick_api, inst_token,"in tickd")
        let lastPrice = 0
        let stopLoss = 0
        ticker = new KiteTicker({
            api_key: tick_api,
            access_token: tick_access
        })
        ticker.connect()
        ticker.on('connect', subscribe)
        // console.log(ticker)
        ticker.on("ticks", onTicks);
        ticker.autoReconnect(false)
        function onTicks(ticks) {
            console.log(`price is, ${ticks[0]?.last_price}`)
            if (lastPrice == 0) {
                // console.log('firstPrice')
                logger.info('firstPrice')
                lastPrice = ticks[0]?.last_price
                stopLoss = ticks[0]?.last_price - Number(lossPrice);
                // setTimeout(() => {
                //     exits();
                // }, 5000)
            }
            else if (lastPrice > 0 && ticks[0]?.last_price > lastPrice) {
                lastPrice = ticks[0]?.last_price
                stopLoss = ticks[0]?.last_price - Number(lossPrice);
                // ticker.unsubscribe([65610759])
                // ticker.disconnect()
                // orderIds.forEach((ele,index) => {
                //     console.log(ele,"after triggerId's")
                //     if(index == orderIds?.length -1){
                //         ticker.on("disconnect", connects);
                //     }
                // })
            }
            else if (stopLoss >= ticks[0]?.last_price) {
                ticker.disconnect()
                // console.log('will stop')
                // console.log(stopLoss)
                // console.log(email)
                logger.info(`will stop,${stopLoss},${email}`)
                let api_key, access_token;
                exits();
                //   const data =  email.map(async (ele, index) => {
                //     await User.findByEmailId(ele).then((result) => {
                //         api_key = result.api_key;
                //         secretkey = result.secret_key;
                //         access_token = result.access_token;
                //     })
                //      .then(() => {
                //         kc = new KiteConnect({
                //           api_key: api_key,
                //         });
                //       }).then(() => {
                //         kc.setAccessToken(access_token);
                //         if (entry_type === "CE") {
                //           newPrice = Math.round(Math.floor(price - 200) / 100) * 100;
                //           symbol = tradingsymbol + date + newPrice + "CE";
                //         } else if (entry_type === "PE") {
                //           newPrice = Math.round(Math.floor(price + 200) / 100) * 100;
                //           symbol = tradingsymbol + date + newPrice + "PE";
                //         } else {
                //           symbol = tradingsymbol;
                //         }
                //         console.log(symbol,"symbol")
                //         let x = regularOrderPlace("regular", symbol,'','','SELL').then((res) => {
                //           return res;
                //         });
                //         return x;
                //       })
                //     .catch(err => {
                //         reject(err)
                //     })
                //     // if(index == arr?.length -1){
                //     //         ticker.on("disconnect", connects);
                //     // }
                // })
            }
        }

        function exits() {
            // console.log(stopLoss)
            logger.info(stopLoss)
            const data = email.map((ele, index) => {
                return User.findByEmailId(ele).then((result) => {
                    api_key = result.api_key;
                    secretkey = result.secret_key;
                    access_token = result.access_token;
                })
                    .then(() => {
                        kc = new KiteConnect({
                            api_key: api_key,
                        });
                    }).then(() => {
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
                        // console.log(symbol, "symbol")
                        logger.info(symbol,'sell_symbol')
                        let x = regularOrderPlace("regular", symbol, '', '', 'SELL').then((res) => {
                            return res;
                        });
                        return x;
                    }).then(res =>{
                        // console.log(res);
                        logger.info(`r${res},after sell`)
                        return res
                    })
                    .catch(err => {
                        logger.error(`${err},after sell error`)
                        reject(err)
                    })
                // if(index == arr?.length -1){
                //         ticker.on("disconnect", connects);
                // }
            })
            res.status(200).json({
                message: "trades executed successfully",
              });
        };

        console.log(ticker.connected());
        function connects() {
            ticker.connect()
            ticker.on('connect', subscribe)
        }
        function subscribe() {
            // var items = [65610759];
            var items = [inst_token];
            ticker.subscribe(items);
            ticker.setMode(ticker.modeFull, items);
        }
    })
}
else{
    // console.log('sdfsd')
    logger.info("sell order type not placed")
    res.status(200).json({
        message: "trades cannot be executed as order is sell",
      });   
}
}
