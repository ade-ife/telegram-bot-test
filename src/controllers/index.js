const randomstring = require('randomstring');
const { User } = require('../models');
const { botsApiPerformRequest, QOS_Bot_Action } = require('../utils/GlobalHelper');

module.exports.userController = require('./user.controller');

exports.makeCall = async (req, res, next) => {
  const {
    message,
    text,
    chat: { id },
    from: { first_name, username },
  } = req.body;
  let response_text = '';

  if (text.includes('start') || text.includes('start')) {
    //////////LOGIC
    let token = '';
    let account = '';
    let created_at = '';
    let linked = '';

    let result = {};

    const start_param = text.subString(7);

    if (start_param) {
      if (start_param.substr(0, 2) == 'b_') {
        var byteChars = base64urlDecode(start_param.substr(2));
        var uint8Array = byteCharsToUint8Array(byteChars);
        var uint32Array = new Uint32Array(uint8Array.buffer);
        result = {
          bot_id: uint32Array[0],
          owner_id: uint32Array[1],
          payload: base64urlEncode(byteChars.substr(8)),
        };
        console.log(result);
      }

      if (start_param.substr(0, 2) == 'B_') {
        var byteChars = base64urlDecode(start_param.substr(2));
        var uint8Array = byteCharsToUint8Array(byteChars);
        var uint32Array = new Uint32Array(uint8Array.buffer);
        console.log(uint32Array[0], uint32Array[1], uint32Array[2], uint32Array[3]);
        result = {
          bot_id: uint32Array[1] * 0x100000000 + uint32Array[0],
          owner_id: uint32Array[3] * 0x100000000 + uint32Array[2],
          payload: base64urlEncode(byteChars.substr(16)),
        };
      }

      // query to check records
      if (User.findOne({ bot_id: result.bot_id })) {
        //check for the user here
        let user = User.findOne({ bot_id: result.bot_id });
        token = user.token;
        account = user.account;
        created_at = user.created_at;
        linked = user.linked == 1 ? 'Connected' : 'Pending';
      } else {
        // if record does not exist
        token = randomstring.generate(30);
        account = `QOS-${randomstring.generate(10)}`;
        created_at = moment();
        linked = 'pending';

        User.create({
          name: username,
          token: token,
          password: bcrypt(token),
          owner_id: result.owner_id,
          bot_id: result.bot_id,
          payload: result.payload,
          account: account,
          live: 0,
          linked: 0,
        });
      }
    }

    //////////LOGIC
    response_text = `Hello ${first_name}, this is the official QOS Payment Bot. It enables you to accept and send payments to different countries, all within the Telegram app. Please note, we only service business type entities. To get started, please:
     1) Read Telegram Docs: https://core.telegram.org/bots/payments
     2) Create Account Here, https://settlement.qosic.net/signup
     3) TOS https://qosic.com/terms-and-conditions
     4) Help /help
     5) Nigeria /nigeria
     6) Link Bot /link *Token*
     Unique Details
     Linked Status: ${linked}
     Account: ${account}
     Token: ${token}
     Date: ${created_at}\n`;
  } else if (text == '/help') {
    response_text = `Contacts:
     info@qosic.com - technical assistance
     Commands:
     /start
     /help
     Link Bot /link *Token*
     /policies \n`;
  } else if (text == '/policies') {
    response_text = `Policies:
     TOS https://qosic.com/terms-and-conditions
     `;
  } else if (text == '/nigeria') {
    response_text = `API Endpoints:
     Commands:
     /nigeria_balance *NGN API Token*\n`;
  }
  //  elseif (str_starts_with($text, '/nigeria_balance')) {

  //      // @$token = ltrim($text, '/nigeria_balance ');
  //      @$token = substr($text, 17);
  //      $body = '{ "env": 1}';
  //      $shell_request = "curl -XPOST --header 'Content-Type: application/json' -H 'Authorization: Bearer $token' -d '$body' https://payment.qosic.net/api/v2/balance";
  //      dump($shell_request);
  //      @$shell_response = shell_exec($shell_request);
  //      Log::info($shell_response);
  //      @$shell_response = json_decode($shell_response);
  //      if ($shell_response->status == '000') {
  //          $available_balance = number_format($shell_response->data->available_balance, 2);
  //          $ledger_balance = number_format($shell_response->data->ledger_balance, 2);
  //          $cumulative_balance = number_format($shell_response->data->cumulative_balance, 2);
  //          $response_text = "Balances:
  //                        Available ₦$available_balance
  //                        Ledger ₦$ledger_balance
  //                        Cumulative ₦$cumulative_balance";
  //      }
  //       else {
  //          $response_text = "Error Processing Request";
  //      }
  //  }
  else if (text.startsWith('/link')) {
    //dd();
    token = text.subString(6);
    //  Log::info($token);
    if (token && User.findOne({ token })) {
      let user = User.findOne({ token });
      Object.assign(user, { linked: 1 });
      user.save();
      let response = botsApiPerformRequest('sendCustomRequest', {
        method: 'connectBotPaymentProvider',
        parameters: {
          owner_id: user.owner_id,
          bot_id: user.bot_id,
          account: user.account,
          payload: user.payload,
          live: user.payload == 1 ? true : false,
        },
      });
      if (!response || !response['ok']) {
        response_text = `Hi ${first_name} Opps Linking Failed`;
        //return Redirect::away('http://t.me/BotFather');
        //save creds
      } else {
        response_text = `Hi ${first_name} Linking was successful`;
        //return Redirect::away('http://t.me/BotFather');
      }
    } else {
      response_text = `Hi ${first_name} Details Not Found`;
    }
  } else {
    // response_text = 'Hey $from_first_name, You Said '.text;
    response_text = `Hey ${first_name}, You Said ${text}`;
  }

  QOS_Bot_Action('sendMessage', {
    chat_id: id,
    text: response_text,
  });
};
