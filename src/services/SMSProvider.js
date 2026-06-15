export class SMSProviderInterface {
  async send(mobile, message) {
    throw new Error('Method not implemented');
  }
}

export class TwilioSMSProvider extends SMSProviderInterface {
  async send(mobile, message) {
    console.log(`[Twilio SMS] Sending to ${mobile}: ${message}`);
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NO;
    if (!accountSid || !authToken || !from) {
      console.warn('[Twilio SMS] Missing config, falling back to mock send.');
      return true;
    }
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: mobile,
          From: from,
          Body: message,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Twilio API error');
      }
      return true;
    } catch (err) {
      console.error('[Twilio SMS] Error:', err.message);
      return false;
    }
  }
}

export class MSG91SMSProvider extends SMSProviderInterface {
  async send(mobile, message) {
    console.log(`[MSG91 SMS] Sending to ${mobile}: ${message}`);
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const sender = process.env.MSG91_SENDER_ID || 'COOPBK';
    if (!authKey) {
      console.warn('[MSG91 SMS] Missing auth key, falling back to mock send.');
      return true;
    }
    try {
      const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: templateId,
          sender: sender,
          recipients: [{ mobiles: mobile, message: message }]
        }),
      });
      if (!response.ok) {
        throw new Error(`MSG91 returned status ${response.status}`);
      }
      return true;
    } catch (err) {
      console.error('[MSG91 SMS] Error:', err.message);
      return false;
    }
  }
}

export class Fast2SMSSMSProvider extends SMSProviderInterface {
  async send(mobile, message) {
    console.log(`[Fast2SMS] Sending to ${mobile}: ${message}`);
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      console.warn('[Fast2SMS] Missing API key, falling back to mock send.');
      return true;
    }
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          numbers: mobile,
        }),
      });
      if (!response.ok) {
        throw new Error(`Fast2SMS returned status ${response.status}`);
      }
      return true;
    } catch (err) {
      console.error('[Fast2SMS] Error:', err.message);
      return false;
    }
  }
}

export class MockSMSProvider extends SMSProviderInterface {
  async send(mobile, message) {
    console.log(`[MOCK SMS] Successfully sent to ${mobile}: "${message}"`);
    return true;
  }
}

export class SMSProviderFactory {
  static getProvider() {
    const provider = process.env.SMS_PROVIDER || 'mock';
    switch (provider.toLowerCase()) {
      case 'twilio':
        return new TwilioSMSProvider();
      case 'msg91':
        return new MSG91SMSProvider();
      case 'fast2sms':
        return new Fast2SMSSMSProvider();
      case 'mock':
      default:
        return new MockSMSProvider();
    }
  }
}

export default SMSProviderFactory;
